import express from 'express';
import cors from 'cors';
import pool from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import multer from 'multer';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001');

app.use(cors());
app.use(express.json());

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
  app.use(express.static(distDir));
}

// Serve media files (uploaded images)
const mediaDir = join(__dirname, '..', 'media');
if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
app.use('/media', express.static(mediaDir));

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
  } catch (err) {
    console.error('Auto-migrate error:', err.message);
  }
})();

// ======================== POSTS ========================

// GET /api/posts — Lấy danh sách bài viết (chỉ hiển thị bài approved cho public)
app.get('/api/posts', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, status } = req.query;
    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params = [];

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

    sql += ' ORDER BY created_at DESC';

    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
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
app.get('/api/posts/pending', async (req, res) => {
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
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, description, category, author_id, is_admin, event_start, event_end, badge } = req.body;

    // Kiểm tra bài viết tồn tại
    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    // Chỉ tác giả hoặc admin mới được sửa
    const post = existing[0];
    if (!is_admin && post.author_id !== author_id) {
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
app.put('/api/posts/:id/approve', async (req, res) => {
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
app.delete('/api/posts/:id', async (req, res) => {
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
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { user_id, username, content } = req.body;
    if (!user_id || !username || !content?.trim()) {
      return res.status(400).json({ error: 'Thiếu thông tin bình luận' });
    }
    const [result] = await pool.query(
      'INSERT INTO post_comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)',
      [req.params.id, user_id, username, content.trim()]
    );
    const [newComment] = await pool.query('SELECT * FROM post_comments WHERE id = ?', [result.insertId]);
    res.status(201).json(newComment[0]);
  } catch (err) {
    console.error('POST /api/posts/:id/comments error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/comments/:id — Xóa bình luận (tác giả hoặc admin)
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { user_id, is_admin } = req.body;
    const [rows] = await pool.query('SELECT * FROM post_comments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bình luận' });
    }
    if (!is_admin && rows[0].user_id !== user_id) {
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
app.get('/api/users', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT id, username, email, create_time, ban, is_admin, cash, vang, vip, ip_address, active, last_time_login, last_time_logout FROM account WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
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
app.put('/api/users/:id/ban', async (req, res) => {
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
app.get('/api/giftcodes', async (req, res) => {
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
app.post('/api/giftcodes', async (req, res) => {
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
app.delete('/api/giftcodes/:id', async (req, res) => {
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

// POST /api/auth/register — Đăng ký
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
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

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: { id: result.insertId, username, email, is_admin: 0, cash: 0, vang: 0, vip: 0 },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/login — Đăng nhập (hỗ trợ email hoặc username)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email; // hỗ trợ cả 2 field name

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Tìm account theo email hoặc username
    const [rows] = await pool.query(
      'SELECT * FROM account WHERE email = ? OR username = ?',
      [loginId, loginId]
    );
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

    // Cập nhật last_time_login
    await pool.query('UPDATE account SET last_time_login = NOW() WHERE id = ?', [account.id]);

    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
        is_admin: account.is_admin,
        cash: account.cash,
        vang: account.vang,
        vip: account.vip,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/auth/me — Lấy thông tin user mới nhất (refresh cash, vàng, vip)
app.get('/api/auth/me', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'Thiếu user_id' });
    }
    const [rows] = await pool.query(
      'SELECT id, username, email, is_admin, cash, vang, vip FROM account WHERE id = ?',
      [Number(user_id)]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }
    res.json({ user: rows[0] });
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
    if (Number(amount) < 10000) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu 10,000 VND' });
    }

    // Tạo nội dung chuyển khoản: username + chuyentien
    const transfer_code = `${username} chuyentien`;

    // Xóa các record cũ bị kẹt (refNo rỗng hoặc format NAP cũ)
    await pool.query("DELETE FROM payments WHERE status = 0 AND (refNo = '' OR transfer_code LIKE 'NAP%')");

    // Check if there's already a pending order for this user with same amount
    const [existing] = await pool.query(
      "SELECT * FROM payments WHERE user_id = ? AND amount = ? AND status = 0 AND transfer_code IS NOT NULL AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)",
      [user_id, Number(amount)]
    );
    if (existing.length > 0) {
      return res.json({
        message: 'Đã có đơn nạp đang chờ',
        deposit: existing[0],
        bank: { bank: BANK_CONFIG.bank, accountName: BANK_CONFIG.accountName, accountNumber: BANK_CONFIG.accountNumber },
      });
    }

    const uniqueRef = `${transfer_code}_${Date.now()}`;
    const [result] = await pool.query(
      "INSERT INTO payments (name, refNo, amount, status, bank, date, transfer_code, user_id, username) VALUES (?, ?, ?, 0, ?, NOW(), ?, ?, ?)",
      [user_id, uniqueRef, Number(amount), BANK_CONFIG.bank, transfer_code, user_id, username]
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
      return res.json({ status: 'success', message: 'Đơn nạp đã được xử lý trước đó' });
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

    // Cập nhật đơn nạp thành công
    const refNo = matched.transactionNumber || matched.refNo || matched.id || '';
    await pool.query('UPDATE payments SET status = 1, refNo = ? WHERE id = ?', [String(refNo), deposit.id]);

    // Cộng cash cho user (1 VND = 1 cash)
    const cashToAdd = deposit.amount;
    await pool.query('UPDATE account SET cash = cash + ?, danap = danap + ? WHERE id = ?', [cashToAdd, cashToAdd, deposit.user_id]);

    // Lấy thông tin user mới nhất
    const [updatedUser] = await pool.query('SELECT id, username, email, is_admin, cash, vang, vip FROM account WHERE id = ?', [deposit.user_id]);

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

// GET /api/admin/players — Tìm kiếm nhân vật theo tên
app.get('/api/admin/players', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT id, name, account_id, head FROM player WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY id ASC';

    const countSql = sql.replace('SELECT id, name, account_id, head', 'SELECT COUNT(*) as total');
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
app.get('/api/admin/players/:id/inventory', async (req, res) => {
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
app.post('/api/admin/players/:id/inventory', async (req, res) => {
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
app.delete('/api/admin/players/:playerId/inventory/:slot', async (req, res) => {
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

// GET /api/admin/item-templates — Lấy danh sách item từ item_template (cho item picker)
app.get('/api/admin/item-templates', async (req, res) => {
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
app.get('/api/admin/item-options', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, NAME as name, color FROM item_option_template ORDER BY id ASC');
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/admin/item-options error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/giftcode-items/:id — Lấy detail giftcode kèm icon_id từ item_template
app.get('/api/admin/giftcode-items/:id', async (req, res) => {
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

// ======================== START ========================
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
});
