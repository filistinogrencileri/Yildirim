'use client';

import { useState } from 'react';
import { CaretDown, CaretUp, Plus } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useAddListItem, useAdminLists, useUpdateListItem } from '@/lib/staff';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

function ListCard({
  list,
}: {
  list: { id: string; key: string; name: { ar: string }; items: Array<{ id: string; value: string; label: { ar: string }; isActive: boolean }> };
}) {
  const [open, setOpen] = useState(false);
  const [labelAr, setLabelAr] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addItem = useAddListItem();
  const updateItem = useUpdateListItem();

  const onAdd = async () => {
    setError(null);
    if (!labelAr.trim() || !/^[a-z0-9_-]{1,60}$/.test(value)) {
      setError('أدخل الاسم بالعربية، والمعرّف بأحرف إنجليزية صغيرة/أرقام/شرطات فقط.');
      return;
    }
    try {
      await addItem.mutateAsync({ listId: list.id, value, labelAr: labelAr.trim() });
      setLabelAr('');
      setValue('');
    } catch {
      setError('تعذّرت الإضافة — قد يكون المعرّف مستخدمًا في هذه القائمة.');
    }
  };

  return (
    <div className={`${card} p-6`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-start">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink-900">{localize(list.name)}</h2>
          <p dir="ltr" className="mt-0.5 text-end text-xs text-ink-300">
            {list.key} · {list.items.length} عنصر
          </p>
        </div>
        {open ? <CaretUp size={18} className="text-ink-300" /> : <CaretDown size={18} className="text-ink-300" />}
      </button>

      {open && (
        <div className="mt-4 border-t border-bone-200 pt-4">
          <ul className="space-y-2">
            {list.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone-200 bg-bone-50 px-4 py-2.5">
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${item.isActive ? 'text-ink-900' : 'text-ink-300 line-through'}`}>
                    {localize(item.label)}
                  </span>
                  <span dir="ltr" className="ms-2 text-xs text-ink-300">{item.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void updateItem.mutateAsync({ itemId: item.id, isActive: !item.isActive })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    item.isActive
                      ? 'border-turquoise-300 bg-turquoise-50 text-turquoise-700 hover:border-error-300 hover:bg-error-50 hover:text-error-700'
                      : 'border-bone-300 text-ink-400 hover:border-turquoise-300 hover:text-turquoise-700'
                  }`}
                >
                  {item.isActive ? 'مفعّل — اضغط للتعطيل' : 'معطّل — اضغط للتفعيل'}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <TextField label="الاسم (بالعربية)" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />
            <TextField
              label="المعرّف (لاتيني)"
              dir="ltr"
              className="text-end font-mono"
              placeholder="new_value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="self-end">
              <Button loading={addItem.isPending} onClick={() => void onAdd()}>
                <Plus size={16} weight="bold" />
                إضافة
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-xl border border-error-300 bg-error-50 px-4 py-2.5 text-sm text-error-700">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Admin management for configurable dropdown lists (offices, statuses, ...). */
export default function AdminListsPage() {
  const { user } = useAuth();
  const { data: lists, isLoading } = useAdminLists();

  if (user?.role !== 'ADMIN') return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;
  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-3xl font-bold text-ink-900">القوائم</h1>
      <p className="mt-2 text-ink-500">
        القوائم المنسدلة المستخدمة في الملفات والخدمات (فروع الهجرة، الحالة الاجتماعية…). عطّل عنصرًا لإخفائه دون حذف بيانات الطلاب.
      </p>
      <div className="mt-8 space-y-4">
        {(lists ?? []).map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
    </div>
  );
}
