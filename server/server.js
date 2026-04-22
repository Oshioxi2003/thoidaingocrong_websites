import express from 'express';
import cors from 'cors';
import compression from 'compression';
import pool from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, createWriteStream, readdirSync } from 'fs';
import multer from 'multer';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001');

// ======================== PERFORMANCE MIDDLEWARE ========================
// Gzip/Brotli compression — giảm 60-80% kích thước response
app.use(compression());

app.use(cors());
app.use(express.json());

// ======================== ADMIN AUTH MIDDLEWARE ========================
// Middleware kiểm tra quyền admin từ header x-user-id + x-session-token
// Xác thực trực tiếp từ database — không tin localStorage
async function requireAdmin(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    const sessionToken = req.headers['x-session-token'];
    if (!userId || !sessionToken) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    const [rows] = await pool.query(
      'SELECT id, is_admin, session_token, ban FROM account WHERE id = ?',
      [Number(userId)]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }
    if (rows[0].ban === 1) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }
    // Kiểm tra session token — chỉ reject khi DB có token VÀ không khớp
    if (rows[0].session_token !== null && rows[0].session_token !== sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    if (rows[0].is_admin !== 1) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này' });
    }
    req.adminUser = rows[0];
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Lỗi xác thực' });
  }
}

// Serve download files (APK, RAR, etc.) with proper headers
const downloadDir = join(__dirname, '..', 'download');
app.use('/download', express.static(downloadDir, {
  setHeaders: (res, filePath) => {
    const basename = filePath.split(/[\\/]/).pop();
    res.set('Content-Disposition', `attachment; filename="${basename}"`);
    if (filePath.endsWith('.apk')) {
      res.set('Content-Type', 'application/vnd.android.package-archive');
    } else if (filePath.endsWith('.rar')) {
      res.set('Content-Type', 'application/x-rar-compressed');
    }
  },
}));

// Serve built frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const distDir = join(__dirname, '..', 'dist');
  app.use(express.static(distDir, {
    maxAge: '1y',              // Cache hashed assets for 1 year
    immutable: true,           // Vite hashes filenames, safe to mark immutable
    setHeaders: (res, filePath) => {
      // index.html should never be cached (SPA entry)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
}

// Serve media files (uploaded images)
const mediaDir = join(__dirname, '..', 'media');
if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
app.use('/media', express.static(mediaDir, { maxAge: '30d' }));

// ======================== IMAGE UPLOAD ========================

// Multer storage — saves to media/news/{post_id}/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const postId = req.query.post_id || 'temp';
    const dir = join(mediaDir, 'news', String(postId));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh'));
  },
});

// POST /api/upload/image — Upload ảnh từ file (Editor.js ImageTool)
app.post('/api/upload/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: 0, message: 'Không có file ảnh' });
  const postId = req.query.post_id || 'temp';
  const url = `/media/news/${postId}/${req.file.filename}`;
  res.json({ success: 1, file: { url } });
});

// POST /api/upload/image-url — Upload ảnh từ URL (Editor.js ImageTool)
app.post('/api/upload/image-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: 0, message: 'Thiếu URL' });

    const postId = req.query.post_id || 'temp';
    const dir = join(mediaDir, 'news', String(postId));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ext = url.split('?')[0].split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const filePath = join(dir, filename);

    await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (response) => {
        if (response.statusCode !== 200) return reject(new Error('Download failed'));
        const ws = createWriteStream(filePath);
        response.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      }).on('error', reject);
    });

    res.json({ success: 1, file: { url: `/media/news/${postId}/${filename}` } });
  } catch (err) {
    console.error('Upload image-url error:', err);
    res.status(500).json({ success: 0, message: 'Lỗi tải ảnh từ URL' });
  }
});

// ======================== AUTO MIGRATE ========================
(async () => {
  try {
    // Thêm cột author_id, author_name
    const [cols] = await pool.query("SHOW COLUMNS FROM posts LIKE 'author_id'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE posts ADD COLUMN author_id int(11) DEFAULT NULL, ADD COLUMN author_name varchar(100) DEFAULT NULL");
      console.log('✅ Added author_id, author_name columns to posts table');
    }
    // Thêm cột event_start, event_end, badge cho sự kiện
    const [eventCols] = await pool.query("SHOW COLUMNS FROM posts LIKE 'event_end'");
    if (eventCols.length === 0) {
      await pool.query(`ALTER TABLE posts
        ADD COLUMN event_start DATETIME DEFAULT NULL,
        ADD COLUMN event_end DATETIME DEFAULT NULL,
        ADD COLUMN badge VARCHAR(20) DEFAULT NULL`);
      console.log('✅ Added event_start, event_end, badge columns to posts table');
    }
    // Thêm cột status cho duyệt bài (approved/pending/rejected)
    const [statusCols] = await pool.query("SHOW COLUMNS FROM posts LIKE 'status'");
    if (statusCols.length === 0) {
      await pool.query("ALTER TABLE posts ADD COLUMN status VARCHAR(20) DEFAULT 'approved'");
      console.log('✅ Added status column to posts table');
    }
    // Tạo bảng post_comments
    await pool.query(`CREATE TABLE IF NOT EXISTS post_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      username VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Thêm cột transfer_code, user_id, username vào bảng payments cho nạp ATM
    const [payTcCols] = await pool.query("SHOW COLUMNS FROM payments LIKE 'transfer_code'");
    if (payTcCols.length === 0) {
      await pool.query(`ALTER TABLE payments
        ADD COLUMN transfer_code VARCHAR(50) DEFAULT NULL,
        ADD COLUMN user_id INT DEFAULT NULL,
        ADD COLUMN username VARCHAR(64) DEFAULT NULL,
        ADD INDEX idx_transfer_code (transfer_code)`);
      console.log('✅ Added transfer_code, user_id, username columns to payments table');
    }

    // Thêm cột vnd vào bảng account (số dư VND)
    const [vndCols] = await pool.query("SHOW COLUMNS FROM account LIKE 'vnd'");
    if (vndCols.length === 0) {
      await pool.query("ALTER TABLE account ADD COLUMN vnd BIGINT DEFAULT 0");
      console.log('✅ Added vnd column to account table');
    }

    // Thêm cột danap vào bảng account (tổng số tiền đã nạp)
    const [danapCols] = await pool.query("SHOW COLUMNS FROM account LIKE 'danap'");
    if (danapCols.length === 0) {
      await pool.query("ALTER TABLE account ADD COLUMN danap BIGINT DEFAULT 0");
      console.log('✅ Added danap column to account table');
    }
    // Thêm cột session_token vào bảng account (dùng cho logout all devices)
    const [stCols] = await pool.query("SHOW COLUMNS FROM account LIKE 'session_token'");
    if (stCols.length === 0) {
      await pool.query("ALTER TABLE account ADD COLUMN session_token VARCHAR(64) DEFAULT NULL");
      console.log('✅ Added session_token column to account table');
    }
  } catch (err) {
    console.error('Auto-migrate error:', err.message);
  }
})();

// ======================== AUTH MIDDLEWARE (SESSION TOKEN) ========================
// Middleware xác thực session token từ header x-session-token
// Dùng cho các endpoint nhạy cảm: đổi mật khẩu, logout-all
async function requireAuth(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    const sessionToken = req.headers['x-session-token'];
    if (!userId || !sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Vui lòng đăng nhập lại' });
    }
    const [rows] = await pool.query(
      'SELECT id, session_token, ban FROM account WHERE id = ?',
      [Number(userId)]
    );
    if (rows.length === 0) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Tài khoản không tồn tại' });
    }
    if (rows[0].ban === 1) {
      return res.status(403).json({ code: 'BANNED', error: 'Tài khoản đã bị khóa' });
    }
    // Chỉ reject khi DB có token VÀ token không khớp
    // Nếu DB token = NULL (user cũ chưa login lại) → vẫn cho qua
    if (rows[0].session_token !== null && rows[0].session_token !== sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    req.authUser = rows[0];
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Lỗi xác thực' });
  }
}

// ======================== POSTS ========================

// GET /api/posts — Lấy danh sách bài viết (chỉ hiển thị bài approved cho public)
app.get('/api/posts', async (req, res) => {
  try {
    const { search, category, excludeCategory, page = 1, limit = 20, status, searchMode } = req.query;
    let selectClause = 'SELECT *';
    // Khi searchMode=title_first, thêm cột phụ để ưu tiên kết quả khớp tiêu đề
    if (search && searchMode === 'title_first') {
      selectClause = 'SELECT *, (title LIKE ?) AS title_match';
    }
    let sql = `${selectClause} FROM posts WHERE 1=1`;
    const params = [];
    if (search && searchMode === 'title_first') {
      params.push(`%${search}%`);
    }

    // Admin có thể xem tất cả status, public chỉ xem approved
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += " AND (status = 'approved' OR status IS NULL)";
    }

    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category !== undefined && category !== '' && category !== 'all') {
      sql += ' AND category = ?';
      params.push(Number(category));
    }
    // Loại trừ category (VD: loại trừ Sự kiện khi xem Tất cả)
    if (excludeCategory !== undefined && excludeCategory !== '') {
      sql += ' AND category != ?';
      params.push(Number(excludeCategory));
    }

    // Sắp xếp: ưu tiên title match trước nếu có search
    if (search && searchMode === 'title_first') {
      sql += ' ORDER BY title_match DESC, created_at DESC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Count total
    const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM').replace(/ ORDER BY .+$/, '');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({
      data: rows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('GET /api/posts error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/posts/pending — Lấy bài viết chờ duyệt (admin)
app.get('/api/posts/pending', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM posts WHERE status = 'pending' ORDER BY created_at DESC");
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/posts/pending error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/posts/my — Lấy bài viết của user hiện tại
app.get('/api/posts/my', async (req, res) => {
  try {
    const { author_id, page = 1, limit = 50 } = req.query;
    if (!author_id) {
      return res.status(400).json({ error: 'Thiếu author_id' });
    }

    let sql = 'SELECT * FROM posts WHERE author_id = ?';
    const params = [Number(author_id)];
    sql += ' ORDER BY created_at DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/posts/my error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/posts/:id — Chi tiết bài viết
app.get('/api/posts/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/posts/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/posts — Tạo bài viết mới
app.post('/api/posts', async (req, res) => {
  try {
    let { title, description, category = 0, author_id, author_name, event_start, event_end, badge, is_admin } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Tiêu đề và nội dung là bắt buộc' });
    }

    // Bài cộng đồng từ user thường => pending, còn lại => approved
    const status = (Number(category) === 4 && !is_admin) ? 'pending' : 'approved';

    const [result] = await pool.query(
      'INSERT INTO posts (title, description, category, author_id, author_name, event_start, event_end, badge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, category, author_id || null, author_name || null, event_start || null, event_end || null, badge || null, status]
    );
    const postId = result.insertId;

    // Move temp images to the real post folder
    const tempDir = join(mediaDir, 'news', 'temp');
    const postDir = join(mediaDir, 'news', String(postId));
    if (existsSync(tempDir)) {
      const { readdirSync, renameSync } = await import('fs');
      if (!existsSync(postDir)) mkdirSync(postDir, { recursive: true });
      const files = readdirSync(tempDir);
      for (const file of files) {
        renameSync(join(tempDir, file), join(postDir, file));
      }
      // Update image URLs in description
      if (files.length > 0) {
        description = description.replaceAll('/media/news/temp/', `/media/news/${postId}/`);
        await pool.query('UPDATE posts SET description = ? WHERE id = ?', [description, postId]);
      }
    }

    const [newPost] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    res.status(201).json(newPost[0]);
  } catch (err) {
    console.error('POST /api/posts error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/posts/:id — Sửa bài viết (chỉ tác giả hoặc admin)
// [FIX] is_admin và user_id được xác thực từ DB qua session token, không tin body
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, description, category, event_start, event_end, badge } = req.body;
    const requestUserId = Number(req.headers['x-user-id']);
    const sessionToken = req.headers['x-session-token'];

    // Xác thực người dùng nếu có gửi token
    let callerIsAdmin = false;
    let callerUserId = null;
    if (requestUserId && sessionToken) {
      const [callerRows] = await pool.query(
        'SELECT id, is_admin, session_token FROM account WHERE id = ?',
        [requestUserId]
      );
      if (callerRows.length > 0) {
        const caller = callerRows[0];
        // Token hợp lệ (hoặc DB token NULL = user cũ)
        if (caller.session_token === null || caller.session_token === sessionToken) {
          callerIsAdmin = caller.is_admin === 1;
          callerUserId = caller.id;
        }
      }
    }

    // Kiểm tra bài viết tồn tại
    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    // Chỉ tác giả hoặc admin (xác thực từ DB) mới được sửa
    const post = existing[0];
    if (!callerIsAdmin && post.author_id !== callerUserId) {
      return res.status(403).json({ error: 'Bạn không có quyền sửa bài viết này' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (event_start !== undefined) { updates.push('event_start = ?'); params.push(event_start || null); }
    if (event_end !== undefined) { updates.push('event_end = ?'); params.push(event_end || null); }
    if (badge !== undefined) { updates.push('badge = ?'); params.push(badge || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu để cập nhật' });
    }

    params.push(req.params.id);
    await pool.query(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('PUT /api/posts/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/posts/:id/approve — Duyệt hoặc từ chối bài viết (admin)
app.put('/api/posts/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' hoặc 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status phải là approved hoặc rejected' });
    }
    const [result] = await pool.query('UPDATE posts SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    const [updated] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('PUT /api/posts/:id/approve error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/posts/:id — Xóa bài viết
app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    res.json({ message: 'Đã xóa bài viết' });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== COMMENTS ========================

// GET /api/posts/:id/comments — Lấy danh sách bình luận
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/posts/:id/comments error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/posts/:id/comments — Thêm bình luận
// [FIX] username lấy từ DB theo user_id + session_token, không tin body
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { content } = req.body;
    const requestUserId = Number(req.headers['x-user-id']);
    const sessionToken = req.headers['x-session-token'];

    if (!requestUserId || !sessionToken) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để bình luận' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống' });
    }

    // Xác thực user từ DB — lấy username thực, không tin body
    const [callerRows] = await pool.query(
      'SELECT id, username, session_token, ban FROM account WHERE id = ?',
      [requestUserId]
    );
    if (callerRows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }
    const caller = callerRows[0];
    if (caller.ban === 1) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }
    // Kiểm tra token (nếu DB có token)
    if (caller.session_token !== null && caller.session_token !== sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    const [result] = await pool.query(
      'INSERT INTO post_comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)',
      [req.params.id, caller.id, caller.username, content.trim()]
    );
    const [newComment] = await pool.query('SELECT * FROM post_comments WHERE id = ?', [result.insertId]);
    res.status(201).json(newComment[0]);
  } catch (err) {
    console.error('POST /api/posts/:id/comments error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/comments/:id — Xóa bình luận (tác giả hoặc admin)
// [FIX] is_admin và user_id xác thực từ DB qua session token, không tin body
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const requestUserId = Number(req.headers['x-user-id']);
    const sessionToken = req.headers['x-session-token'];

    if (!requestUserId || !sessionToken) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    // Xác thực người gửi request từ DB
    const [callerRows] = await pool.query(
      'SELECT id, is_admin, session_token FROM account WHERE id = ?',
      [requestUserId]
    );
    if (callerRows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }
    const caller = callerRows[0];
    if (caller.session_token !== null && caller.session_token !== sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    // Kiểm tra bình luận tồn tại
    const [rows] = await pool.query('SELECT * FROM post_comments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bình luận' });
    }

    // Chỉ tác giả bình luận hoặc admin (xác thực từ DB) mới được xóa
    const isAdmin = caller.is_admin === 1;
    if (!isAdmin && rows[0].user_id !== caller.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này' });
    }

    await pool.query('DELETE FROM post_comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa bình luận' });
  } catch (err) {
    console.error('DELETE /api/comments/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== USERS (account) ========================

// GET /api/users — Lấy danh sách user (ẩn password)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT id, username, email, create_time, ban, is_admin, cash, vang, vip, vnd, ip_address, active, last_time_login, last_time_logout FROM account WHERE 1=1';
    const params = [];

    if (search) {
      const searchNum = Number(search);
      if (!isNaN(searchNum) && String(searchNum) === search.trim()) {
        // Tìm theo ID chính xác hoặc theo tên/email/IP
        sql += ' AND (id = ? OR username LIKE ? OR email LIKE ? OR ip_address LIKE ?)';
        params.push(searchNum, `%${search}%`, `%${search}%`, `%${search}%`);
      } else {
        sql += ' AND (username LIKE ? OR email LIKE ? OR ip_address LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }
    if (role === 'admin') {
      sql += ' AND is_admin = 1';
    } else if (role === 'user') {
      sql += ' AND is_admin = 0';
    }
    if (status === 'active') {
      sql += ' AND ban = 0';
    } else if (status === 'banned') {
      sql += ' AND ban = 1';
    }

    sql += ' ORDER BY id ASC';

    const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({
      data: rows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/users/:id/ban — Ban/unban user
app.put('/api/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { ban } = req.body; // 0 hoặc 1
    await pool.query('UPDATE account SET ban = ? WHERE id = ?', [ban ? 1 : 0, req.params.id]);
    res.json({ message: ban ? 'Đã cấm user' : 'Đã mở cấm user' });
  } catch (err) {
    console.error('PUT /api/users/:id/ban error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== GIFTCODES ========================

// GET /api/giftcodes — Lấy danh sách giftcode
app.get('/api/giftcodes', requireAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM giftcode WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND code LIKE ?';
      params.push(`%${search}%`);
    }
    if (status === 'active') {
      sql += ' AND count_left > 0 AND expired > NOW()';
    } else if (status === 'expired') {
      sql += ' AND (count_left <= 0 OR expired <= NOW())';
    }

    sql += ' ORDER BY datecreate DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/giftcodes error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/giftcodes — Tạo giftcode mới
app.post('/api/giftcodes', requireAdmin, async (req, res) => {
  try {
    const { code, count_left = 100, detail = '[]', type = 0, expired = '2030-01-01 00:00:00' } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Mã giftcode là bắt buộc' });
    }
    const [result] = await pool.query(
      'INSERT INTO giftcode (code, count_left, detail, type, expired) VALUES (?, ?, ?, ?, ?)',
      [code, count_left, detail, type, expired]
    );
    const [newGc] = await pool.query('SELECT * FROM giftcode WHERE id = ?', [result.insertId]);
    res.status(201).json(newGc[0]);
  } catch (err) {
    console.error('POST /api/giftcodes error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/giftcodes/redeem — Đổi giftcode (yêu cầu đã tạo nhân vật)
// Flow: check player.giftcode (đã nhập chưa) → check items_bag (đủ ô trống) → đẩy vào items_bag + ghi giftcode
app.post('/api/giftcodes/redeem', async (req, res) => {
  try {
    // 🔧 BẢO TRÌ: Tạm tắt chức năng đổi giftcode
    return res.status(503).json({ error: 'Chức năng đổi Giftcode đang bảo trì. Vui lòng quay lại sau!' });

    const { code, user_id } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã giftcode' });
    }
    if (!user_id) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng giftcode' });
    }

    // Kiểm tra player đã tạo chưa
    const [players] = await pool.query('SELECT id, name, giftcode, items_bag FROM player WHERE account_id = ?', [user_id]);
    if (players.length === 0) {
      return res.status(400).json({ error: 'Bạn chưa tạo nhân vật trong game. Vui lòng vào game tạo nhân vật trước!' });
    }
    const player = players[0];

    // Kiểm tra giftcode có tồn tại và còn hạn
    const [rows] = await pool.query(
      'SELECT * FROM giftcode WHERE code = ? AND count_left > 0 AND expired > NOW()',
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mã không hợp lệ hoặc đã hết hạn' });
    }
    const gc = rows[0];

    // 1) Kiểm tra player đã dùng giftcode này chưa (bảng player.giftcode)
    let usedCodes = [];
    try {
      usedCodes = JSON.parse(player.giftcode || '[]');
    } catch { usedCodes = []; }

    if (usedCodes.includes(code)) {
      return res.status(400).json({ error: 'Bạn đã sử dụng mã này rồi!' });
    }

    // Parse reward items từ giftcode detail
    let rewardItems = [];
    try {
      rewardItems = JSON.parse(gc.detail || '[]');
    } catch { rewardItems = []; }

    if (rewardItems.length === 0) {
      return res.status(400).json({ error: 'Giftcode không có vật phẩm nào!' });
    }

    // 2) Kiểm tra items_bag có đủ ô trống không
    let rawItems = [];
    try { rawItems = JSON.parse(player.items_bag || '[]'); } catch { rawItems = []; }

    // Đếm số ô trống (item_id = -1) trong items_bag
    let emptySlots = 0;
    const emptySlotIndices = [];
    for (let i = 0; i < rawItems.length; i++) {
      try {
        const parsed = JSON.parse(rawItems[i]);
        if (parsed[0] === -1) {
          emptySlots++;
          emptySlotIndices.push(i);
        }
      } catch { continue; }
    }

    // Số item cần thêm
    const itemsNeeded = rewardItems.length;

    if (emptySlots < itemsNeeded) {
      return res.status(400).json({
        error: `Hành trang không đủ ô trống! Cần ${itemsNeeded} ô, hiện còn ${emptySlots} ô trống. Vui lòng vào game dọn hành trang trước.`,
      });
    }

    // 3) Đẩy items vào items_bag
    const timestamp = Date.now();
    let slotIdx = 0; // index trong emptySlotIndices
    for (const reward of rewardItems) {
      // Chuyển options từ format giftcode [{id, param}] sang format NRO items_bag
      const optionsStr = JSON.stringify(reward.options || []);
      const newItem = `[${reward.id},${reward.quantity || 1},${JSON.stringify(optionsStr)},${timestamp}]`;

      if (slotIdx < emptySlotIndices.length) {
        // Điền vào ô trống
        rawItems[emptySlotIndices[slotIdx]] = newItem;
        slotIdx++;
      } else {
        // Thêm vào cuối (fallback, không nên xảy ra vì đã check ở trên)
        rawItems.push(newItem);
      }
    }

    // 4) Ghi giftcode đã dùng để tránh nhập lại
    usedCodes.push(code);

    // Cập nhật player: items_bag + giftcode
    await pool.query(
      'UPDATE player SET giftcode = ?, items_bag = ? WHERE id = ?',
      [JSON.stringify(usedCodes), JSON.stringify(rawItems), player.id]
    );

    // Giảm count_left của giftcode
    await pool.query('UPDATE giftcode SET count_left = count_left - 1 WHERE id = ?', [gc.id]);

    res.json({
      message: `Đổi mã thành công! ${itemsNeeded} vật phẩm đã được thêm vào hành trang nhân vật "${player.name}".`,
      reward: gc.detail,
      player_name: player.name,
      items_added: itemsNeeded,
    });
  } catch (err) {
    console.error('POST /api/giftcodes/redeem error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/giftcodes/:id — Xóa giftcode
app.delete('/api/giftcodes/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM giftcode WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy giftcode' });
    }
    res.json({ message: 'Đã xóa giftcode' });
  } catch (err) {
    console.error('DELETE /api/giftcodes/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== AUTH ========================

// reCAPTCHA v3 verification helper
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

async function verifyRecaptcha(token, expectedAction) {
  if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
    console.warn('⚠️ RECAPTCHA_SECRET_KEY chưa được cấu hình, bỏ qua kiểm tra reCAPTCHA');
    return { success: true, score: 1.0 }; // Bỏ qua nếu chưa cấu hình
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET_KEY);
    params.append('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    console.log(`reCAPTCHA verify [${expectedAction}]:`, { success: data.success, score: data.score, action: data.action });

    if (!data.success) {
      return { success: false, score: 0, error: 'Xác minh reCAPTCHA thất bại' };
    }

    // Kiểm tra action khớp
    if (expectedAction && data.action !== expectedAction) {
      return { success: false, score: data.score, error: 'Action reCAPTCHA không khớp' };
    }

    // Score < 0.5 => likely bot
    if (data.score < 0.5) {
      return { success: false, score: data.score, error: `Hệ thống phát hiện hành vi bot (score: ${data.score})` };
    }

    return { success: true, score: data.score };
  } catch (err) {
    console.error('reCAPTCHA verify error:', err);
    return { success: false, score: 0, error: 'Lỗi xác minh reCAPTCHA' };
  }
}

// POST /api/auth/register — Đăng ký
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, recaptchaToken } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Xác minh reCAPTCHA v3
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Thiếu mã xác minh reCAPTCHA' });
    }
    const captchaResult = await verifyRecaptcha(recaptchaToken, 'register');
    if (!captchaResult.success) {
      return res.status(403).json({ error: captchaResult.error || 'Xác minh reCAPTCHA thất bại' });
    }
    // Validate username: chỉ cho phép chữ cái và số, không kí tự đặc biệt
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return res.status(400).json({ error: 'Tên tài khoản chỉ được chứa chữ cái và số, không dấu cách hoặc kí tự đặc biệt' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Tên tài khoản phải từ 3-20 kí tự' });
    }

    // Kiểm tra username đã tồn tại
    const [existUser] = await pool.query('SELECT id FROM account WHERE username = ?', [username]);
    if (existUser.length > 0) {
      return res.status(409).json({ error: 'Tên tài khoản đã được sử dụng' });
    }

    // Kiểm tra email đã tồn tại
    const [existEmail] = await pool.query('SELECT id FROM account WHERE email = ?', [email]);
    if (existEmail.length > 0) {
      return res.status(409).json({ error: 'Email đã được sử dụng' });
    }

    // Insert vào bảng account (mật khẩu lưu thẳng)
    const [result] = await pool.query(
      'INSERT INTO account (username, password, email) VALUES (?, ?, ?)',
      [username, password, email]
    );

    // Tạo session token ngay sau đăng ký — giống login
    const { randomUUID } = await import('crypto');
    const sessionToken = randomUUID();
    await pool.query('UPDATE account SET session_token = ? WHERE id = ?', [sessionToken, result.insertId]);

    res.status(201).json({
      message: 'Đăng ký thành công!',
      session_token: sessionToken,
      user: { id: result.insertId, username, email, is_admin: 0, cash: 0, vang: 0, vip: 0, vnd: 0 },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/login — Đăng nhập (hỗ trợ email hoặc username)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, email, password, recaptchaToken } = req.body;
    const loginId = identifier || email; // hỗ trợ cả 2 field name

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Xác minh reCAPTCHA v3
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Thiếu mã xác minh reCAPTCHA' });
    }
    const captchaResult = await verifyRecaptcha(recaptchaToken, 'login');
    if (!captchaResult.success) {
      return res.status(403).json({ error: captchaResult.error || 'Xác minh reCAPTCHA thất bại' });
    }

    // Tìm account — ưu tiên username trước, sau đó mới tìm email
    // (Tránh bug: username của user A trùng email của user B → trả sai account)
    let [rows] = await pool.query('SELECT * FROM account WHERE username = ? LIMIT 1', [loginId]);
    if (rows.length === 0) {
      [rows] = await pool.query('SELECT * FROM account WHERE email = ? LIMIT 1', [loginId]);
    }
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    const account = rows[0];

    // Kiểm tra ban
    if (account.ban === 1) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    // So sánh password trực tiếp
    if (password !== account.password) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    // Tạo session token mới (invalidate tất cả phiên cũ trên các thiết bị khác)
    const { randomUUID } = await import('crypto');
    const sessionToken = randomUUID();

    // Cập nhật last_time_login + session_token
    await pool.query('UPDATE account SET last_time_login = NOW(), session_token = ? WHERE id = ?', [sessionToken, account.id]);

    res.json({
      message: 'Đăng nhập thành công!',
      session_token: sessionToken,
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
        is_admin: account.is_admin,
        cash: account.cash,
        vang: account.vang,
        vip: account.vip,
        vnd: account.vnd || 0,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/logout — Đăng xuất thiết bị hiện tại (xóa token trên server)
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE account SET session_token = NULL WHERE id = ?', [req.authUser.id]);
    res.json({ message: 'Đã đăng xuất' });
  } catch (err) {
    console.error('POST /api/auth/logout error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/logout-all — Đăng xuất tất cả thiết bị
// Xóa session_token → tất cả thiết bị sẽ bị kick khi check token
app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE account SET session_token = NULL WHERE id = ?', [req.authUser.id]);
    res.json({ message: 'Đã đăng xuất khỏi tất cả thiết bị' });
  } catch (err) {
    console.error('POST /api/auth/logout-all error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/change-password — Đổi mật khẩu (đăng xuất thiết bị cũ, giữ thiết bị hiện tại)
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Lấy mật khẩu hiện tại từ DB
    const [rows] = await pool.query('SELECT password FROM account WHERE id = ?', [req.authUser.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    if (rows[0].password !== old_password) {
      return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
    }

    // Tạo session token mới (kick tất cả thiết bị cũ)
    const { randomUUID } = await import('crypto');
    const newToken = randomUUID();

    await pool.query(
      'UPDATE account SET password = ?, session_token = ? WHERE id = ?',
      [new_password, newToken, req.authUser.id]
    );

    res.json({
      message: 'Đổi mật khẩu thành công! Các thiết bị khác đã bị đăng xuất.',
      session_token: newToken, // Trả token mới để thiết bị hiện tại cập nhật
    });
  } catch (err) {
    console.error('POST /api/auth/change-password error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/auth/me — Lấy thông tin user mới nhất (refresh cash, vàng, vip)
// [FIX] Yêu cầu session token hợp lệ — không cho xem thông tin người khác
app.get('/api/auth/me', async (req, res) => {
  try {
    const { user_id } = req.query;
    const sessionToken = req.headers['x-session-token'];

    if (!user_id) {
      return res.status(400).json({ error: 'Thiếu user_id' });
    }
    // Bắt buộc phải có session token — không cho anonymous enumerate
    if (!sessionToken) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, is_admin, cash, vang, vip, vnd, session_token FROM account WHERE id = ?',
      [Number(user_id)]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }
    const account = rows[0];

    // Chỉ kick khi DB có token VÀ token không khớp
    // DB token = NULL (user cũ chưa login lại) → vẫn trả bình thường
    if (account.session_token !== null && account.session_token !== sessionToken) {
      return res.status(401).json({ code: 'INVALID_SESSION', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    const { session_token: _st, ...userWithoutToken } = account;
    res.json({ user: userWithoutToken });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== DEPOSIT (NẠP ATM) ========================

const BANK_CONFIG = {
  bank: process.env.BANK_NAME || 'ACB',
  accountName: process.env.BANK_ACCOUNT_NAME || 'DINH THI NGOC BICH',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '48932127',
  token: process.env.BANK_API_TOKEN || '038f4e174f40df529acb1903b2d56423',
};

// POST /api/deposit/create — Tạo đơn nạp mới
app.post('/api/deposit/create', async (req, res) => {
  try {
    const { user_id, username, amount } = req.body;
    if (!user_id || !username || !amount) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10000) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu 10,000 VND' });
    }

    // Xóa các đơn pending quá 24 giờ
    await pool.query("DELETE FROM payments WHERE status = 0 AND transfer_code IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");

    // Check nếu user đã có đơn pending (bất kỳ amount nào) trong 24h
    const [existingAny] = await pool.query(
      "SELECT * FROM payments WHERE user_id = ? AND status = 0 AND transfer_code IS NOT NULL AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT 1",
      [user_id]
    );
    if (existingAny.length > 0) {
      return res.json({
        message: 'Đã có đơn nạp đang chờ',
        deposit: existingAny[0],
        bank: { bank: BANK_CONFIG.bank, accountName: BANK_CONFIG.accountName, accountNumber: BANK_CONFIG.accountNumber },
      });
    }

    // Tạo 4 số random duy nhất (không trùng với đơn pending nào khác)
    let randomCode;
    let attempts = 0;
    do {
      randomCode = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
      const [dup] = await pool.query(
        "SELECT id FROM payments WHERE status = 0 AND transfer_code LIKE ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        [`% ${randomCode}`]
      );
      if (dup.length === 0) break;
      attempts++;
    } while (attempts < 20);

    const transfer_code = `${username} ${randomCode}`;
    const uniqueRef = `${transfer_code}_${Date.now()}`;
    const [result] = await pool.query(
      "INSERT INTO payments (name, refNo, amount, status, bank, date, transfer_code, user_id, username) VALUES (?, ?, ?, 0, ?, NOW(), ?, ?, ?)",
      [user_id, uniqueRef, parsedAmount, BANK_CONFIG.bank, transfer_code, user_id, username]
    );

    const [newDeposit] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: 'Đã tạo đơn nạp',
      deposit: newDeposit[0],
      bank: { bank: BANK_CONFIG.bank, accountName: BANK_CONFIG.accountName, accountNumber: BANK_CONFIG.accountNumber },
    });
  } catch (err) {
    console.error('POST /api/deposit/create error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/deposit/check — Kiểm tra thanh toán qua API sieuthicode
app.post('/api/deposit/check', async (req, res) => {
  try {
    const { deposit_id } = req.body;
    if (!deposit_id) {
      return res.status(400).json({ error: 'Thiếu deposit_id' });
    }

    // Lấy đơn nạp
    const [deposits] = await pool.query('SELECT * FROM payments WHERE id = ? AND transfer_code IS NOT NULL', [deposit_id]);
    if (deposits.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn nạp' });
    }
    const deposit = deposits[0];
    if (deposit.status === 1) {
      // Đơn đã xử lý — trả user mới nhất để client cập nhật số dư
      const [updatedUser] = await pool.query('SELECT id, username, email, is_admin, cash, vang, vip, vnd FROM account WHERE id = ?', [deposit.user_id]);
      return res.json({ status: 'success', message: 'Đơn nạp đã được xử lý thành công!', user: updatedUser[0] || null });
    }

    // Gọi API sieuthicode.net (historyapi)
    const apiUrl = `https://api.sieuthicode.net/historyapi${BANK_CONFIG.bank.toLowerCase()}/${BANK_CONFIG.token}`;
    let apiData;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const apiRes = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      apiData = await apiRes.json();
    } catch (fetchErr) {
      console.error('Fetch sieuthicode API error:', fetchErr.message);
      return res.json({ status: 'pending', message: 'Không thể kết nối đến hệ thống thanh toán, vui lòng thử lại sau' });
    }

    if (!apiData || !apiData.data || !Array.isArray(apiData.data)) {
      console.error('sieuthicode API returned unexpected data:', JSON.stringify(apiData).substring(0, 200));
      return res.json({ status: 'pending', message: 'Chưa tìm thấy giao dịch, vui lòng thử lại' });
    }

    // Tìm giao dịch khớp transfer_code và amount (chỉ xét giao dịch IN)
    const matched = apiData.data.find(tx => {
      if (tx.type && tx.type !== 'IN') return false; // Chỉ xét giao dịch nhận tiền
      const content = (tx.description || '').toUpperCase();
      const txAmount = Number(tx.amount || 0);
      return content.includes(deposit.transfer_code.toUpperCase()) && txAmount >= deposit.amount;
    });

    if (!matched) {
      return res.json({ status: 'pending', message: 'Chưa tìm thấy giao dịch, vui lòng thử lại sau' });
    }

    // FIX Bug #1: Atomic UPDATE — chỉ cập nhật nếu status vẫn = 0 (tránh cộng tiền 2 lần)
    const refNo = matched.transactionNumber || matched.refNo || matched.id || '';
    const [updateResult] = await pool.query('UPDATE payments SET status = 1, refNo = ? WHERE id = ? AND status = 0', [String(refNo), deposit.id]);

    if (updateResult.affectedRows === 0) {
      // Đơn đã được xử lý bởi background auto-check (race condition avoided)
      const [updatedUser] = await pool.query('SELECT id, username, email, is_admin, cash, vang, vip, vnd FROM account WHERE id = ?', [deposit.user_id]);
      return res.json({ status: 'success', message: 'Đơn nạp đã được xử lý thành công!', user: updatedUser[0] || null });
    }

    // Cộng cash + VND cho user (1 VND = 1 cash)
    const cashToAdd = deposit.amount;
    await pool.query('UPDATE account SET cash = cash + ?, danap = danap + ?, vnd = vnd + ? WHERE id = ?', [cashToAdd, cashToAdd, cashToAdd, deposit.user_id]);

    // Lấy thông tin user mới nhất
    const [updatedUser] = await pool.query('SELECT id, username, email, is_admin, cash, vang, vip, vnd FROM account WHERE id = ?', [deposit.user_id]);

    console.log(`✅ [User-check] Nạp thành công ${cashToAdd.toLocaleString()}đ cho user #${deposit.user_id} (${deposit.username}) - Mã: ${deposit.transfer_code}`);

    res.json({
      status: 'success',
      message: `Nạp thành công ${cashToAdd.toLocaleString()} cash!`,
      cash_added: cashToAdd,
      user: updatedUser[0] || null,
    });
  } catch (err) {
    console.error('POST /api/deposit/check error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/deposit/history — Lịch sử nạp
app.get('/api/deposit/history', async (req, res) => {
  try {
    const { user_id, page = 1, limit = 20 } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'Thiếu user_id' });
    }

    let sql = 'SELECT * FROM payments WHERE user_id = ? AND transfer_code IS NOT NULL';
    const params = [Number(user_id)];
    sql += ' ORDER BY created_at DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/deposit/history error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/deposit/cancel — Hủy đơn nạp pending (để tạo đơn mới với mệnh giá khác)
app.post('/api/deposit/cancel', async (req, res) => {
  try {
    const { deposit_id, user_id } = req.body;
    if (!deposit_id || !user_id) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }

    // Chỉ hủy đơn pending (status=0) và thuộc về user đó
    const [result] = await pool.query(
      'DELETE FROM payments WHERE id = ? AND user_id = ? AND status = 0',
      [deposit_id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn nạp hoặc đơn đã được xử lý' });
    }

    console.log(`🗑️ [Cancel] User #${user_id} hủy đơn nạp #${deposit_id}`);
    res.json({ message: 'Đã hủy đơn nạp' });
  } catch (err) {
    console.error('POST /api/deposit/cancel error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== BACKGROUND AUTO-CHECK PENDING DEPOSITS ========================
// Tự động kiểm tra tất cả đơn pending mỗi 30 giây — không cần user bấm nút
let autoCheckRunning = false; // Prevent overlapping runs

async function autoCheckPendingDeposits() {
  if (autoCheckRunning) return; // Tránh chạy chồng nếu lần trước chưa xong
  autoCheckRunning = true;
  try {
    // Xóa đơn pending quá 24h (giải phóng mã số 4 chữ số)
    const [expired] = await pool.query(
      "DELETE FROM payments WHERE status = 0 AND transfer_code IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    if (expired.affectedRows > 0) {
      console.log(`🗑️ [Auto-cleanup] Xóa ${expired.affectedRows} đơn pending quá 24h`);
    }

    // Lấy tất cả đơn pending còn hiệu lực
    const [pendingDeposits] = await pool.query(
      "SELECT * FROM payments WHERE status = 0 AND transfer_code IS NOT NULL AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );

    if (pendingDeposits.length === 0) return;

    // Gọi API bank 1 lần duy nhất cho tất cả đơn
    const apiUrl = `https://api.sieuthicode.net/historyapi${BANK_CONFIG.bank.toLowerCase()}/${BANK_CONFIG.token}`;
    let apiData;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const apiRes = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      apiData = await apiRes.json();
    } catch {
      return; // API lỗi, thử lại lần sau
    }

    if (!apiData?.data || !Array.isArray(apiData.data)) return;

    // Kiểm tra từng đơn pending
    for (const deposit of pendingDeposits) {
      const matched = apiData.data.find(tx => {
        if (tx.type && tx.type !== 'IN') return false;
        const content = (tx.description || '').toUpperCase();
        const txAmount = Number(tx.amount || 0);
        return content.includes(deposit.transfer_code.toUpperCase()) && txAmount >= deposit.amount;
      });

      if (matched) {
        // FIX Bug #1: Atomic UPDATE — chỉ cập nhật nếu status vẫn = 0 (tránh cộng tiền 2 lần)
        const refNo = matched.transactionNumber || matched.refNo || matched.id || '';
        const [updateResult] = await pool.query('UPDATE payments SET status = 1, refNo = ? WHERE id = ? AND status = 0', [String(refNo), deposit.id]);

        // Chỉ cộng tiền nếu UPDATE thực sự thay đổi (affectedRows > 0)
        if (updateResult.affectedRows > 0) {
          await pool.query('UPDATE account SET cash = cash + ?, danap = danap + ?, vnd = vnd + ? WHERE id = ?', [deposit.amount, deposit.amount, deposit.amount, deposit.user_id]);
          console.log(`✅ [Auto-check] Nạp thành công ${deposit.amount.toLocaleString()}đ cho user #${deposit.user_id} (${deposit.username}) - Mã: ${deposit.transfer_code}`);
        }
      }
    }
  } catch (err) {
    console.error('[Auto-check] Error:', err.message);
  } finally {
    autoCheckRunning = false;
  }
}

// Chạy auto-check mỗi 30 giây
setInterval(autoCheckPendingDeposits, 30 * 1000);
// Chạy ngay 1 lần khi server khởi động (sau 5 giây)
setTimeout(autoCheckPendingDeposits, 5000);
console.log('🔄 Auto-check pending deposits: Running every 30 seconds');

// ======================== ADMIN — QUẢN LÝ DÒNG TIỀN ========================

// GET /api/admin/deposits — Lấy tất cả giao dịch nạp (admin)
app.get('/api/admin/deposits', requireAdmin, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM payments WHERE transfer_code IS NOT NULL';
    const params = [];

    if (search) {
      sql += ' AND (username LIKE ? OR transfer_code LIKE ? OR refNo LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status === 'success') {
      sql += ' AND status = 1';
    } else if (status === 'pending') {
      sql += ' AND status = 0';
    }

    sql += ' ORDER BY created_at DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/admin/deposits error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/deposits/stats — Thống kê dòng tiền
app.get('/api/admin/deposits/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ totalDeposits }]] = await pool.query("SELECT COUNT(*) as totalDeposits FROM payments WHERE transfer_code IS NOT NULL AND status = 1");
    const [[{ totalAmount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) as totalAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 1");
    const [[{ pendingCount }]] = await pool.query("SELECT COUNT(*) as pendingCount FROM payments WHERE transfer_code IS NOT NULL AND status = 0");
    const [[{ pendingAmount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) as pendingAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 0");
    const [[{ todayDeposits }]] = await pool.query("SELECT COUNT(*) as todayDeposits FROM payments WHERE transfer_code IS NOT NULL AND status = 1 AND DATE(created_at) = CURDATE()");
    const [[{ todayAmount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) as todayAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 1 AND DATE(created_at) = CURDATE()");
    res.json({ totalDeposits, totalAmount, pendingCount, pendingAmount, todayDeposits, todayAmount });
  } catch (err) {
    console.error('GET /api/admin/deposits/stats error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/admin/deposits/:id/approve — Admin duyệt đơn nạp thủ công
app.put('/api/admin/deposits/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 1 = thành công, -1 = từ chối
    const [deposits] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (deposits.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn nạp' });

    const deposit = deposits[0];

    if (status === 1 && deposit.status !== 1) {
      // Duyệt: cộng cash
      await pool.query('UPDATE payments SET status = 1, refNo = ? WHERE id = ?', [`ADMIN_APPROVE_${Date.now()}`, deposit.id]);
      await pool.query('UPDATE account SET cash = cash + ?, danap = danap + ?, vnd = vnd + ? WHERE id = ?', [deposit.amount, deposit.amount, deposit.amount, deposit.user_id]);
      res.json({ message: `Đã duyệt và cộng ${deposit.amount.toLocaleString()} cash cho user #${deposit.user_id}` });
    } else if (status === -1) {
      // Từ chối: xóa đơn
      await pool.query('DELETE FROM payments WHERE id = ?', [deposit.id]);
      res.json({ message: 'Đã từ chối và xóa đơn nạp' });
    } else {
      res.json({ message: 'Đơn nạp đã được xử lý trước đó' });
    }
  } catch (err) {
    console.error('PUT /api/admin/deposits/:id/approve error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== ADMIN — PLAYER INVENTORY ========================

// Cache item_template data for icon_id + name lookup
let itemTemplateCache = null;
let itemTemplateCacheTime = 0;
const ITEM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getItemTemplateMap() {
  const now = Date.now();
  if (itemTemplateCache && (now - itemTemplateCacheTime) < ITEM_CACHE_TTL) {
    return itemTemplateCache;
  }
  const [rows] = await pool.query('SELECT id, NAME as name, icon_id, TYPE as type, gender, level, description FROM item_template');
  const map = {};
  for (const row of rows) {
    map[row.id] = row;
  }
  itemTemplateCache = map;
  itemTemplateCacheTime = now;
  return map;
}

// Helper: parse NRO items_bag JSON format and enrich with icon_id + name from item_template
// Each item is a string: "[item_id, quantity, \"[options]\", timestamp]"
async function parseNROItems(itemsBagJson) {
  const result = [];
  const templateMap = await getItemTemplateMap();
  try {
    const rawItems = JSON.parse(itemsBagJson || '[]');
    for (let i = 0; i < rawItems.length; i++) {
      try {
        const parsed = JSON.parse(rawItems[i]);
        const itemId = parsed[0];
        if (itemId === -1) continue; // skip empty slots
        const template = templateMap[itemId] || {};
        result.push({
          slot: i,
          item_id: itemId,
          quantity: parsed[1] || 0,
          options: typeof parsed[2] === 'string' ? parsed[2] : JSON.stringify(parsed[2] || '[]'),
          icon_id: template.icon_id ?? itemId,
          name: template.name || `Item #${itemId}`,
        });
      } catch { continue; }
    }
  } catch { /* invalid JSON */ }
  return result;
}

// GET /api/admin/players — Tìm kiếm nhân vật theo tên hoặc tên account, hỗ trợ sắp xếp
app.get('/api/admin/players', requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20, sort } = req.query;
    let sql = 'SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, a.username as account_name FROM player p LEFT JOIN account a ON p.account_id = a.id WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (p.name LIKE ? OR a.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sắp xếp theo item 457 cần xử lý JS-side (items_bag phức tạp)
    if (sort === 'item457_desc') {
      // Fetch tất cả kết quả, parse items_bag để tìm item 457, sort và paginate bằng JS
      sql += ' ORDER BY p.id ASC';
      const countSql = sql.replace('SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, a.username as account_name', 'SELECT COUNT(*) as total');
      const [countRows] = await pool.query(countSql, params);
      const total = countRows[0].total;

      // Lấy tất cả kèm items_bag
      const sqlAll = sql.replace(
        'SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, a.username as account_name',
        'SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, p.items_bag, a.username as account_name'
      );
      const [allRows] = await pool.query(sqlAll, params);

      // Parse items_bag tìm item 457 quantity
      for (const row of allRows) {
        let qty457 = 0;
        try {
          const rawItems = JSON.parse(row.items_bag || '[]');
          for (const raw of rawItems) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed[0] === 457) { qty457 += (parsed[1] || 0); }
            } catch { continue; }
          }
        } catch { /* ignore */ }
        row._item457 = qty457;
        delete row.items_bag; // Không trả items_bag cho client
      }

      // Sort by item 457 quantity DESC
      allRows.sort((a, b) => b._item457 - a._item457);

      const offset = (Number(page) - 1) * Number(limit);
      const paged = allRows.slice(offset, offset + Number(limit));
      // Xóa _item457 temp field
      for (const r of paged) delete r._item457;

      return res.json({ data: paged, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }

    // Sắp xếp theo vàng (data_inventory[0]) — dùng MySQL JSON_EXTRACT
    if (sort === 'gold_desc') {
      sql += ' ORDER BY CAST(JSON_EXTRACT(p.data_inventory, "$[0]") AS UNSIGNED) DESC';
    } else {
      sql += ' ORDER BY p.id ASC';
    }

    const countSql = sql.replace('SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, a.username as account_name', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/admin/players error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/players/:id/inventory — Lấy hành trang của nhân vật
app.get('/api/admin/players/:id/inventory', requireAdmin, async (req, res) => {
  try {
    const playerId = req.params.id;
    const [rows] = await pool.query(
      'SELECT items_bag FROM player WHERE id = ?',
      [playerId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }

    const items = await parseNROItems(rows[0].items_bag);
    res.json({ data: items });
  } catch (err) {
    console.error('GET /api/admin/players/:id/inventory error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/players/:id/inventory — Thêm vật phẩm vào hành trang
app.post('/api/admin/players/:id/inventory', requireAdmin, async (req, res) => {
  try {
    const playerId = req.params.id;
    const { item_id, quantity = 1, options = '[]' } = req.body;

    if (item_id === undefined || item_id === null) {
      return res.status(400).json({ error: 'Thiếu item_id' });
    }

    // Lấy items_bag hiện tại
    const [rows] = await pool.query('SELECT items_bag FROM player WHERE id = ?', [playerId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }

    let rawItems = [];
    try { rawItems = JSON.parse(rows[0].items_bag || '[]'); } catch { rawItems = []; }

    // Tìm slot trống (item_id = -1) hoặc thêm cuối
    const timestamp = Date.now();
    const newItem = `[${item_id},${quantity},${JSON.stringify(options)},${timestamp}]`;

    let inserted = false;
    for (let i = 0; i < rawItems.length; i++) {
      try {
        const parsed = JSON.parse(rawItems[i]);
        if (parsed[0] === -1) {
          rawItems[i] = newItem;
          inserted = true;
          break;
        }
      } catch { continue; }
    }
    if (!inserted) {
      rawItems.push(newItem);
    }

    // Cập nhật DB
    await pool.query('UPDATE player SET items_bag = ? WHERE id = ?', [JSON.stringify(rawItems), playerId]);

    const items = await parseNROItems(JSON.stringify(rawItems));
    res.status(201).json({ message: 'Đã thêm vật phẩm', data: items });
  } catch (err) {
    console.error('POST /api/admin/players/:id/inventory error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/admin/players/:playerId/inventory/:slot — Xóa vật phẩm khỏi hành trang
app.delete('/api/admin/players/:playerId/inventory/:slot', requireAdmin, async (req, res) => {
  try {
    const { playerId, slot } = req.params;
    const slotIdx = Number(slot);

    const [rows] = await pool.query('SELECT items_bag FROM player WHERE id = ?', [playerId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }

    let rawItems = [];
    try { rawItems = JSON.parse(rows[0].items_bag || '[]'); } catch { rawItems = []; }

    if (slotIdx < 0 || slotIdx >= rawItems.length) {
      return res.status(404).json({ error: 'Không tìm thấy vật phẩm ở slot này' });
    }

    // Đặt slot thành empty: [-1,0,"[]",timestamp]
    const timestamp = Date.now();
    rawItems[slotIdx] = `[-1,0,"[]",${timestamp}]`;

    await pool.query('UPDATE player SET items_bag = ? WHERE id = ?', [JSON.stringify(rawItems), playerId]);

    const items = await parseNROItems(JSON.stringify(rawItems));
    res.json({ message: 'Đã xóa vật phẩm', data: items });
  } catch (err) {
    console.error('DELETE /api/admin/players/:playerId/inventory/:slot error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/admin/players/:id/stats — Chỉnh sửa vàng, ngọc xanh, hồng ngọc, sức mạnh
app.put('/api/admin/players/:id/stats', requireAdmin, async (req, res) => {
  try {
    const playerId = req.params.id;
    const { vang, ngocXanh, hongNgoc, sucManh } = req.body;

    // Lấy data hiện tại
    const [rows] = await pool.query('SELECT data_inventory, data_point FROM player WHERE id = ?', [playerId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }

    // Parse data_inventory: [vàng, ngọc_xanh, hồng_ngọc, ...]
    let dataInventory = [];
    try { dataInventory = JSON.parse(rows[0].data_inventory || '[]'); } catch { dataInventory = []; }
    // Đảm bảo mảng có đủ 3 phần tử
    while (dataInventory.length < 3) dataInventory.push(0);

    if (vang !== undefined && vang !== null) dataInventory[0] = Number(vang);
    if (ngocXanh !== undefined && ngocXanh !== null) dataInventory[1] = Number(ngocXanh);
    if (hongNgoc !== undefined && hongNgoc !== null) dataInventory[2] = Number(hongNgoc);

    // Parse data_point: [..., sức_mạnh (index 1), ...]
    let dataPoint = [];
    try { dataPoint = JSON.parse(rows[0].data_point || '[]'); } catch { dataPoint = []; }
    // Đảm bảo mảng có đủ 2 phần tử
    while (dataPoint.length < 2) dataPoint.push(0);

    if (sucManh !== undefined && sucManh !== null) dataPoint[1] = Number(sucManh);

    // Cập nhật DB
    await pool.query(
      'UPDATE player SET data_inventory = ?, data_point = ? WHERE id = ?',
      [JSON.stringify(dataInventory), JSON.stringify(dataPoint), playerId]
    );

    // Trả về data mới
    const [updated] = await pool.query(
      'SELECT p.id, p.name, p.account_id, p.head, p.data_inventory, p.data_point, a.username as account_name FROM player p LEFT JOIN account a ON p.account_id = a.id WHERE p.id = ?',
      [playerId]
    );

    console.log(`✏️ [Admin] Cập nhật stats nhân vật #${playerId}: vàng=${dataInventory[0]}, ngọc=${dataInventory[1]}, hồng ngọc=${dataInventory[2]}, sức mạnh=${dataPoint[1]}`);
    res.json({ message: 'Cập nhật thành công', player: updated[0] });
  } catch (err) {
    console.error('PUT /api/admin/players/:id/stats error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/item-templates — Lấy danh sách item từ item_template (cho item picker)
app.get('/api/admin/item-templates', requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    let sql = 'SELECT id, NAME as name, icon_id, TYPE as type, gender, level, description FROM item_template WHERE 1=1';
    const params = [];

    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        sql += ' AND (id = ? OR NAME LIKE ? OR icon_id = ?)';
        params.push(searchNum, `%${search}%`, searchNum);
      } else {
        sql += ' AND NAME LIKE ?';
        params.push(`%${search}%`);
      }
    }

    sql += ' ORDER BY id ASC';

    const countSql = sql.replace('SELECT id, NAME as name, icon_id, TYPE as type, gender, level, description', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/admin/item-templates error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/item-options — Lấy danh sách item_option_template
app.get('/api/admin/item-options', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, NAME as name, color FROM item_option_template ORDER BY id ASC');
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/admin/item-options error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/giftcode-items/:id — Lấy detail giftcode kèm icon_id từ item_template
app.get('/api/admin/giftcode-items/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT detail FROM giftcode WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy giftcode' });

    let items = [];
    try { items = JSON.parse(rows[0].detail || '[]'); } catch { items = []; }

    const templateMap = await getItemTemplateMap();
    const enriched = items.map((item, idx) => {
      const t = templateMap[item.id] || {};
      return {
        ...item,
        icon_id: t.icon_id ?? item.id,
        name: t.name || `Item #${item.id}`,
        slot: idx,
      };
    });
    res.json({ data: enriched });
  } catch (err) {
    console.error('GET /api/admin/giftcode-items/:id error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== ADMIN — HISTORY TRANSACTION ========================

// GET /api/admin/transactions — Lấy lịch sử giao dịch item
app.get('/api/admin/transactions', requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let sql = 'SELECT * FROM history_transaction WHERE 1=1';
    const params = [];

    if (search) {
      // Tìm theo tên người chơi (player1, player2)
      sql += ' AND (player1 LIKE ? OR player2 LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/admin/transactions error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/transactions/columns — Lấy cấu trúc bảng history_transaction
app.get('/api/admin/transactions/columns', requireAdmin, async (req, res) => {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM history_transaction');
    res.json({ data: columns.map(c => c.Field) });
  } catch (err) {
    console.error('GET /api/admin/transactions/columns error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== ADMIN — BÁO CÁO TỔNG HỢP ========================

// GET /api/admin/report — Báo cáo tổng quan hệ thống
app.get('/api/admin/report', requireAdmin, async (req, res) => {
  try {
    // ---- Tổng số tài khoản ----
    const [[{ totalAccounts }]] = await pool.query('SELECT COUNT(*) as totalAccounts FROM account');
    const [[{ activeAccounts }]] = await pool.query('SELECT COUNT(*) as activeAccounts FROM account WHERE ban = 0');
    const [[{ bannedAccounts }]] = await pool.query('SELECT COUNT(*) as bannedAccounts FROM account WHERE ban = 1');
    const [[{ adminAccounts }]] = await pool.query('SELECT COUNT(*) as adminAccounts FROM account WHERE is_admin = 1');

    // ---- Tổng số nhân vật (người chơi) ----
    const [[{ totalPlayers }]] = await pool.query('SELECT COUNT(*) as totalPlayers FROM player');

    // ---- Tài khoản đăng nhập hôm nay (last_time_login = today) ----
    const [[{ loginToday }]] = await pool.query(
      "SELECT COUNT(*) as loginToday FROM account WHERE DATE(last_time_login) = CURDATE()"
    );
    // ---- Tài khoản đăng ký hôm nay ----
    const [[{ registerToday }]] = await pool.query(
      "SELECT COUNT(*) as registerToday FROM account WHERE DATE(create_time) = CURDATE()"
    );
    // ---- Tài khoản đăng ký 7 ngày qua ----
    const [[{ registerWeek }]] = await pool.query(
      "SELECT COUNT(*) as registerWeek FROM account WHERE create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    // ---- Tài khoản đăng ký 30 ngày qua ----
    const [[{ registerMonth }]] = await pool.query(
      "SELECT COUNT(*) as registerMonth FROM account WHERE create_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    // ---- Đăng ký theo ngày (30 ngày gần nhất) ----
    const [registerChart] = await pool.query(
      `SELECT DATE(create_time) as date, COUNT(*) as count
       FROM account
       WHERE create_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(create_time)
       ORDER BY date ASC`
    );

    // ---- Dòng tiền ----
    const [[{ totalDepositAmount }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as totalDepositAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 1"
    );
    const [[{ totalDepositCount }]] = await pool.query(
      "SELECT COUNT(*) as totalDepositCount FROM payments WHERE transfer_code IS NOT NULL AND status = 1"
    );
    const [[{ pendingDepositAmount }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as pendingDepositAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 0"
    );
    const [[{ pendingDepositCount }]] = await pool.query(
      "SELECT COUNT(*) as pendingDepositCount FROM payments WHERE transfer_code IS NOT NULL AND status = 0"
    );
    const [[{ todayDepositAmount }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as todayDepositAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 1 AND DATE(created_at) = CURDATE()"
    );
    const [[{ weekDepositAmount }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as weekDepositAmount FROM payments WHERE transfer_code IS NOT NULL AND status = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );

    // ---- Nạp tiền theo ngày (30 ngày gần nhất) ----
    const [depositChart] = await pool.query(
      `SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM payments
       WHERE transfer_code IS NOT NULL AND status = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // ---- Top 10 người chơi nạp nhiều nhất ----
    const [topDepositors] = await pool.query(
      `SELECT a.username, a.danap as total_deposit, p.name as player_name
       FROM account a
       LEFT JOIN player p ON p.account_id = a.id
       WHERE a.ban = 0 AND a.danap > 0
       ORDER BY a.danap DESC
       LIMIT 10`
    );

    // ---- Top 10 người chơi nhiều nhiệm vụ nhất ----
    const [topTask] = await pool.query(
      `SELECT p.name as player_name, a.username,
              CAST(JSON_EXTRACT(p.data_task, '$[0]') AS UNSIGNED) as task_count
       FROM player p
       JOIN account a ON p.account_id = a.id
       WHERE a.ban = 0 AND a.is_admin = 0
         AND JSON_EXTRACT(p.data_task, '$[0]') > 0
       ORDER BY task_count DESC
       LIMIT 10`
    );

    // ---- Top 10 người chơi sức mạnh cao nhất ----
    const [topPower] = await pool.query(
      `SELECT p.name as player_name, a.username,
              CAST(JSON_EXTRACT(p.data_point, '$[1]') AS UNSIGNED) as power
       FROM player p
       JOIN account a ON p.account_id = a.id
       WHERE a.ban = 0 AND JSON_EXTRACT(p.data_point, '$[1]') > 0
       ORDER BY power DESC
       LIMIT 10`
    );

    // ---- 10 tài khoản đăng ký mới nhất ----
    const [newAccounts] = await pool.query(
      `SELECT id, username, email, create_time, ip_address, cash, ban
       FROM account
       ORDER BY create_time DESC
       LIMIT 10`
    );

    res.json({
      accounts: { totalAccounts, activeAccounts, bannedAccounts, adminAccounts },
      players: { totalPlayers },
      activity: { loginToday, registerToday, registerWeek, registerMonth },
      deposits: {
        totalDepositAmount: Number(totalDepositAmount),
        totalDepositCount: Number(totalDepositCount),
        pendingDepositAmount: Number(pendingDepositAmount),
        pendingDepositCount: Number(pendingDepositCount),
        todayDepositAmount: Number(todayDepositAmount),
        weekDepositAmount: Number(weekDepositAmount),
      },
      charts: {
        registerChart: registerChart.map(r => ({ date: r.date, count: Number(r.count) })),
        depositChart: depositChart.map(r => ({ date: r.date, amount: Number(r.amount), count: Number(r.count) })),
      },
      topDepositors: topDepositors.map(r => ({ ...r, total_deposit: Number(r.total_deposit) })),
      topTask: topTask.map(r => ({ ...r, task_count: Number(r.task_count) })),
      topPower: topPower.map(r => ({ ...r, power: Number(r.power) })),
      newAccounts,
    });
  } catch (err) {
    console.error('GET /api/admin/report error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== SITEMAP.XML (SEO) ========================

/**
 * Vietnamese slug generator — must match frontend src/lib/seo.ts
 */
const VIETNAMESE_MAP_SERVER = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
};

function generateSlugServer(text) {
  return text
    .toLowerCase()
    .split('')
    .map(char => VIETNAMESE_MAP_SERVER[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

const SITE_DOMAIN = process.env.SITE_DOMAIN || 'https://thoidaingocrong.com';

// GET /api/sitemap.xml — Auto-generate sitemap from database
app.get('/api/sitemap.xml', async (req, res) => {
  try {
    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/news', priority: '0.9', changefreq: 'daily' },
      { loc: '/events', priority: '0.8', changefreq: 'daily' },
      { loc: '/download', priority: '0.8', changefreq: 'weekly' },
      { loc: '/community', priority: '0.7', changefreq: 'daily' },
      { loc: '/giftcode', priority: '0.7', changefreq: 'daily' },
      { loc: '/about', priority: '0.5', changefreq: 'monthly' },
    ];

    // Dynamic pages — approved posts
    const [posts] = await pool.query(
      "SELECT id, title, created_at FROM posts WHERE status = 'approved' OR status IS NULL ORDER BY created_at DESC LIMIT 1000"
    );

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_DOMAIN}${page.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Post pages
    for (const post of posts) {
      const slug = generateSlugServer(post.title);
      const lastmod = new Date(post.created_at).toISOString().split('T')[0];
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_DOMAIN}/news/${post.id}/${slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('GET /api/sitemap.xml error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// ======================== STATS ========================
app.get('/api/stats', async (req, res) => {
  try {
    const [[{ totalPosts }]] = await pool.query('SELECT COUNT(*) as totalPosts FROM posts');
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM account');
    const [[{ totalGiftcodes }]] = await pool.query('SELECT COUNT(*) as totalGiftcodes FROM giftcode');
    res.json({ totalPosts, totalUsers, totalGiftcodes });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== TOP SERVER ========================

// GET /api/top-server — Lấy bảng xếp hạng top server
app.get('/api/top-server', async (req, res) => {
  try {
    const LIMIT = 50;

    // ---- TOP NHIỆM VỤ ----
    const [taskRows] = await pool.query(
      `SELECT p.name, p.data_task FROM player p
       JOIN account a ON p.account_id = a.id
       WHERE a.ban = 0 AND a.is_admin = 0`
    );
    const taskList = [];
    for (const row of taskRows) {
      try {
        const parsed = JSON.parse(row.data_task || '[]');
        const taskCount = Number(parsed[0]) || 0;
        if (taskCount > 0) {
          taskList.push({ name: row.name, value: taskCount });
        }
      } catch { continue; }
    }
    taskList.sort((a, b) => b.value - a.value);
    const topTask = taskList.slice(0, LIMIT).map((item, i) => ({
      rank: i + 1,
      name: item.name,
      value: item.value,
    }));

    // ---- TOP ĐẠI GIA (tổng nạp từ bảng payments) ----
    // Ưu tiên danap từ account, fallback sang SUM payments nếu danap = 0
    const [depositRows] = await pool.query(
      `SELECT p.name, COALESCE(
        NULLIF(a.danap, 0),
        (SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.name = a.id AND pay.status = 1)
      ) as total_deposit
       FROM player p 
       JOIN account a ON p.account_id = a.id 
       WHERE a.ban = 0 AND a.is_admin = 0
       HAVING total_deposit > 0
       ORDER BY total_deposit DESC 
       LIMIT ?`, [LIMIT]
    );
    const topDeposit = depositRows.map((row, i) => ({
      rank: i + 1,
      name: row.name,
      value: Number(row.total_deposit) || 0,
    }));

    // ---- TOP SỨC MẠNH ----
    // data_point[1] = sức mạnh (HP/power tổng)
    // pet: phần tử thứ 2 (index 1) trong mảng pet chứa stats, stats[1] = pet power
    const [powerRows] = await pool.query(
      `SELECT p.name, p.data_point, p.pet FROM player p
       JOIN account a ON p.account_id = a.id
       WHERE a.ban = 0 AND a.is_admin = 0`
    );
    const powerList = [];
    for (const row of powerRows) {
      try {
        const pointData = JSON.parse(row.data_point || '[]');
        const power = Number(pointData[1]) || 0;

        // Parse pet power cho tiebreaker
        let petPower = 0;
        try {
          const petArr = JSON.parse(row.pet || '[]');
          if (petArr.length >= 2) {
            const petStatsStr = petArr[1];
            const petStats = typeof petStatsStr === 'string' ? JSON.parse(petStatsStr) : petStatsStr;
            petPower = Number(petStats[1]) || 0;
          }
        } catch { /* ignore pet parse errors */ }

        if (power > 0) {
          powerList.push({ name: row.name, value: power, petPower });
        }
      } catch { continue; }
    }
    // Sort: power DESC, petPower DESC (ai có pet mạnh hơn xếp trước khi power bằng nhau)
    powerList.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return b.petPower - a.petPower;
    });
    const topPower = powerList.slice(0, LIMIT).map((item, i) => ({
      rank: i + 1,
      name: item.name,
      value: item.value,
      pet_power: item.petPower,
    }));

    res.json({ task: topTask, deposit: topDeposit, power: topPower });
  } catch (err) {
    console.error('GET /api/top-server error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== SPA CATCH-ALL (must be AFTER all API routes) ========================
if (process.env.NODE_ENV === 'production') {
  const distDir = join(__dirname, '..', 'dist');
  app.get('{*path}', (req, res, next) => {
    // Don't serve SPA for API, download, or media routes — let them 404 normally
    if (req.path.startsWith('/api') || req.path.startsWith('/download') || req.path.startsWith('/media')) {
      return next();
    }
    res.sendFile(join(distDir, 'index.html'));
  });
}

// ======================== GALLERY (public/images) ========================

// GET /api/gallery — Tự động liệt kê tất cả ảnh trong public/images
const galleryDir = join(__dirname, '..', 'public', 'images');
app.get('/api/gallery', (_req, res) => {
  try {
    if (!existsSync(galleryDir)) {
      return res.json({ data: [] });
    }
    const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'];
    const files = readdirSync(galleryDir)
      .filter(f => exts.some(ext => f.toLowerCase().endsWith(ext)))
      .sort((a, b) => {
        // Sắp xếp theo số nếu tên file là số, ngược lại theo alphabet
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map(f => `/images/${f}`);
    res.json({ data: files });
  } catch (err) {
    console.error('GET /api/gallery error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ======================== START ========================
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
});
