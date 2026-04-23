"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

interface FormDialogState<T, F> {
  open: boolean;
  editing: T | null;
  form: F;
  saving: boolean;
  setForm: Dispatch<SetStateAction<F>>;
  openCreate: () => void;
  openEdit: (item: T) => void;
  close: () => void;
  submit: (handler: (form: F, editing: T | null) => Promise<void>) => Promise<void>;
}

export function useFormDialog<T, F>(options: {
  emptyForm: F;
  mapToForm: (item: T) => F;
}): FormDialogState<T, F> {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<F>(options.emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(options.emptyForm);
    setOpen(true);
  }, [options.emptyForm]);

  const openEdit = useCallback(
    (item: T) => {
      setEditing(item);
      setForm(options.mapToForm(item));
      setOpen(true);
    },
    [options.mapToForm],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const submit = useCallback(
    async (handler: (form: F, editing: T | null) => Promise<void>) => {
      setSaving(true);
      try {
        await handler(form, editing);
        setOpen(false);
      } finally {
        setSaving(false);
      }
    },
    [form, editing],
  );

  return { open, editing, form, saving, setForm, openCreate, openEdit, close, submit };
}
