import { useEffect, useRef, useCallback } from 'react';
import EditorJS, { type OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import Code from '@editorjs/code';
// @ts-ignore
import Delimiter from '@editorjs/delimiter';
// @ts-ignore
import Embed from '@editorjs/embed';
// @ts-ignore
import Table from '@editorjs/table';
// @ts-ignore
import Marker from '@editorjs/marker';
// @ts-ignore
import InlineCode from '@editorjs/inline-code';
// @ts-ignore
import Quote from '@editorjs/quote';
// @ts-ignore
import Warning from '@editorjs/warning';
// @ts-ignore
import Checklist from '@editorjs/checklist';
// @ts-ignore
import Raw from '@editorjs/raw';
// @ts-ignore
import Underline from '@editorjs/underline';
// @ts-ignore
import LinkTool from '@editorjs/link';
// @ts-ignore
import ImageTool from '@editorjs/image';

interface EditorProps {
  data?: OutputData;
  onChange?: (data: OutputData) => void;
  readOnly?: boolean;
  placeholder?: string;
  postId?: number | string;
}

export default function Editor({ data, onChange, readOnly = false, placeholder = 'Bắt đầu viết bài...', postId }: EditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const isReady = useRef(false);

  const initEditor = useCallback(() => {
    if (!holderRef.current || isReady.current) return;

    const pid = postId || 'temp';

    const editor = new EditorJS({
      holder: holderRef.current,
      readOnly,
      placeholder,
      data: data || undefined,
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: 'Nhập tiêu đề...',
            levels: [2, 3, 4],
            defaultLevel: 2,
          },
          inlineToolbar: true,
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: 'unordered',
          },
        },
        checklist: {
          class: Checklist,
          inlineToolbar: true,
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Nhập trích dẫn...',
            captionPlaceholder: 'Tác giả...',
          },
        },
        warning: {
          class: Warning,
          inlineToolbar: true,
          config: {
            titlePlaceholder: 'Tiêu đề cảnh báo...',
            messagePlaceholder: 'Nội dung cảnh báo...',
          },
        },
        code: {
          class: Code,
          config: {
            placeholder: 'Nhập code...',
          },
        },
        delimiter: Delimiter,
        table: {
          // @ts-ignore
          class: Table,
          inlineToolbar: true,
          config: {
            rows: 2,
            cols: 3,
          },
        },
        image: {
          class: ImageTool,
          config: {
            endpoints: {
              byFile: `/api/upload/image?post_id=${pid}`,
              byUrl: `/api/upload/image-url?post_id=${pid}`,
            },
          },
        },
        embed: {
          class: Embed,
          config: {
            services: {
              youtube: true,
              facebook: true,
              instagram: true,
              twitter: true,
            },
          },
        },
        linkTool: {
          class: LinkTool,
          config: {
            endpoint: '/api/fetchUrl',
          },
        },
        raw: {
          class: Raw,
          config: {
            placeholder: 'Nhập HTML code...',
          },
        },
        marker: {
          class: Marker,
        },
        inlineCode: {
          class: InlineCode,
        },
        underline: Underline,
      },
      onReady: () => {
        isReady.current = true;
      },
      onChange: async (api) => {
        if (onChange) {
          const outputData = await api.saver.save();
          onChange(outputData);
        }
      },
    });

    editorRef.current = editor;
  }, []);

  useEffect(() => {
    initEditor();
    return () => {
      if (editorRef.current && isReady.current) {
        editorRef.current.destroy();
        editorRef.current = null;
        isReady.current = false;
      }
    };
  }, [initEditor]);

  return (
    <div
      ref={holderRef}
      id="editorjs"
      className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-primary/50 transition-colors [&_.ce-block__content]:max-w-none [&_.ce-toolbar__content]:max-w-none"
    />
  );
}

/** Recursively render list items (supports both old string[] and new {content, items}[] formats) */
function renderListItems(items: any[]): string {
  return items.map((item) => {
    if (typeof item === 'string') {
      return `<li>${item}</li>`;
    }
    // New format: { content: string, items: SubItem[] }
    const text = item.content || item.text || '';
    const children = item.items && item.items.length > 0
      ? `<ul>${renderListItems(item.items)}</ul>`
      : '';
    return `<li>${text}${children}</li>`;
  }).join('');
}

/** Render Editor.js output data to HTML */
export function renderEditorData(data: OutputData): string {
  if (!data?.blocks) return '';

  return data.blocks.map((block) => {
    switch (block.type) {
      case 'header':
        return `<h${block.data.level} class="editor-header">${block.data.text}</h${block.data.level}>`;

      case 'paragraph':
        return `<p>${block.data.text}</p>`;

      case 'list': {
        const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
        const listItems = renderListItems(block.data.items || []);
        return `<${tag}>${listItems}</${tag}>`;
      }

      case 'checklist': {
        const checks = (block.data.items || []).map((item: { text: string; checked: boolean }) =>
          `<div class="checklist-item flex items-center gap-2 my-1">
            <input type="checkbox" ${item.checked ? 'checked' : ''} disabled class="accent-primary" />
            <span class="${item.checked ? 'line-through text-muted-foreground' : ''}">${item.text}</span>
          </div>`
        ).join('');
        return `<div class="checklist my-4">${checks}</div>`;
      }

      case 'quote':
        return `<blockquote class="border-l-4 border-primary/50 bg-primary/5 py-4 pl-6 pr-4 my-6 rounded-r-xl">
          <p class="italic">${block.data.text}</p>
          ${block.data.caption ? `<cite class="text-sm text-muted-foreground mt-2 block">— ${block.data.caption}</cite>` : ''}
        </blockquote>`;

      case 'warning':
        return `<div class="warning-block my-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div class="font-bold text-yellow-600 dark:text-yellow-400 mb-1">⚠️ ${block.data.title}</div>
          <div class="text-sm">${block.data.message}</div>
        </div>`;

      case 'code':
        return `<pre class="my-6 rounded-xl bg-gray-900 p-4 overflow-x-auto"><code class="text-sm text-green-400">${block.data.code?.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;

      case 'delimiter':
        return '<hr class="my-8 border-border" />';

      case 'table': {
        const content = block.data.content || [];
        const withHeadings = block.data.withHeadings;
        const rows = content.map((row: string[], idx: number) => {
          const cellTag = withHeadings && idx === 0 ? 'th' : 'td';
          const cells = row.map((cell: string) =>
            `<${cellTag} class="border border-border px-3 py-2">${cell}</${cellTag}>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<div class="my-6 overflow-x-auto"><table class="w-full border-collapse border border-border">${rows}</table></div>`;
      }

      case 'image': {
        const url = block.data.file?.url || block.data.url || '';
        const caption = block.data.caption || '';
        const stretched = block.data.stretched ? 'w-full' : 'max-w-2xl mx-auto';
        const bordered = block.data.withBorder ? 'border border-border' : '';
        const bg = block.data.withBackground ? 'bg-muted/50 p-4 rounded-xl' : '';
        return `<figure class="my-6 ${bg}">
          <img src="${url}" alt="${caption}" class="rounded-lg ${stretched} ${bordered}" loading="lazy" />
          ${caption ? `<figcaption class="text-center text-sm text-muted-foreground mt-2">${caption}</figcaption>` : ''}
        </figure>`;
      }

      case 'embed':
        return `<div class="my-6">
          <div class="relative overflow-hidden rounded-xl" style="padding-top:56.25%">
            <iframe src="${block.data.embed}" class="absolute inset-0 w-full h-full" frameborder="0" allowfullscreen></iframe>
          </div>
          ${block.data.caption ? `<p class="text-center text-sm text-muted-foreground mt-2">${block.data.caption}</p>` : ''}
        </div>`;

      case 'raw':
        return `<div class="my-6">${block.data.html || ''}</div>`;

      case 'attaches': {
        const file = block.data.file || {};
        return `<div class="my-4 rounded-xl border border-border bg-muted/30 p-4">
          <a href="${file.url}" target="_blank" rel="noopener" class="flex items-center gap-3 text-primary hover:underline">
            <span>📎</span>
            <span>${block.data.title || file.name || 'File đính kèm'}</span>
            ${file.size ? `<span class="text-xs text-muted-foreground">(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
          </a>
        </div>`;
      }

      default:
        return `<p>${block.data.text || JSON.stringify(block.data)}</p>`;
    }
  }).join('\n');
}
