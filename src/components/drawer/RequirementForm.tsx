import { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Autocomplete,
  Chip,
  FormHelperText,
  Stack,
} from '@mui/material';
import { PRIORITY_LIST, STATUS_LIST } from '@/constants/index';
import { PriorityChip } from '@/components/common/PriorityChip';
import { StatusChip } from '@/components/common/StatusChip';
import { AttachmentField } from './AttachmentField';
import { useAccounts } from '@/context/AccountContext';
import type {
  Requirement,
  RequirementInput,
  Category,
  Priority,
  Status,
  Attachment,
  Doc,
  FileItem,
} from '@/types';

export interface RequirementFormProps {
  initial?: Requirement | null;
  categories: Category[];
  allTags?: string[];
  onSubmit: (data: RequirementInput) => void;
  onCancel: () => void;
  readOnly?: boolean;
  /** 预览库中文件/文档（附件点击时触发） */
  onPreviewRef?: (target: { kind: 'doc'; doc: Doc } | { kind: 'file'; file: FileItem }) => void;
  /** 开启自动保存（编辑模式下）：任何字段或附件变化后延时自动保存 */
  autoSave?: boolean;
  /** 自动保存回调（不关闭抽屉） */
  onAutoSave?: (data: RequirementInput) => void;
}

/**
 * 需求创建/编辑表单
 * 含标题校验、分类/优先级/状态/标签/截止日期输入
 * readOnly 模式下所有字段禁用，用于查看历史版本
 */
export function RequirementForm({
  initial,
  categories,
  allTags = [],
  onSubmit,
  onCancel,
  readOnly = false,
  onPreviewRef,
  autoSave = false,
  onAutoSave,
}: RequirementFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? '',
  );
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? 'P2',
  );
  const [status, setStatus] = useState<Status>(initial?.status ?? 'review');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [dueDate, setDueDate] = useState<string>(initial?.dueDate ?? '');
  const [attachments, setAttachments] = useState<Attachment[]>(
    initial?.attachments ?? [],
  );
  const [error, setError] = useState('');
  /** 上次已保存快照（自动保存去重基准，空串 = 尚未建立基准） */
  const lastSavedRef = useRef<string>('');

  // 账号列表（创建者/跟进者下拉选项）；新建需求时创建者默认当前账户
  const { usernames, currentUser } = useAccounts();
  const [creator, setCreator] = useState<string>(
    initial?.creator ?? currentUser,
  );
  const [owner, setOwner] = useState<string>(initial?.owner ?? '');

  // 自动保存：编辑模式下任何字段/附件变化，防抖 1.2s 后静默保存（含版本变更）
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;
    const data: RequirementInput = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      priority,
      status,
      tags,
      dueDate: dueDate || null,
      attachments,
      creator,
      owner,
    };
    const snapshot = JSON.stringify(data);
    // 首次挂载：建立基准快照，不触发保存
    if (!lastSavedRef.current) {
      lastSavedRef.current = snapshot;
      return;
    }
    if (snapshot === lastSavedRef.current) return;
    // 标题/分类未就绪时暂不保存
    if (!data.title || !data.categoryId) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = snapshot;
      onAutoSave(data);
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSave,
    onAutoSave,
    title,
    description,
    categoryId,
    priority,
    status,
    tags,
    dueDate,
    attachments,
    creator,
    owner,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入需求标题');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    setError('');
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      priority,
      status,
      tags,
      dueDate: dueDate || null,
      attachments,
      creator,
      owner,
    });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      sx={{ mt: 2 }}
    >
      {/* 标题 */}
      <TextField
        label="标题"
        required
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={!!error && !title.trim()}
        placeholder="简要描述这条需求…"
        autoFocus
        disabled={readOnly}
      />

      {/* 描述 */}
      <TextField
        label="描述（可粘贴 reqflow://doc/xxx 链接关联文档）"
        fullWidth
        multiline
        minRows={9}
        maxRows={18}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="详细说明需求背景、验收标准等…"
        disabled={readOnly}
      />

      {/* 参考文档附件 */}
      <AttachmentField
        value={attachments}
        onChange={setAttachments}
        onPreviewRef={onPreviewRef}
        readOnly={readOnly}
      />

      {/* 分类 + 优先级 */}
      <Stack direction="row" spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>分类</InputLabel>
          <Select
            value={categoryId}
            label="分类"
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={readOnly}
          >
            {categories.length === 0 ? (
              <MenuItem value="" disabled>
                暂无分类，请先在设置中添加
              </MenuItem>
            ) : (
              categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box className="flex items-center gap-1.5">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: cat.color,
                      }}
                    />
                    {cat.name}
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>优先级</InputLabel>
          <Select
            value={priority}
            label="优先级"
            onChange={(e) => setPriority(e.target.value as Priority)}
            renderValue={(v) => <PriorityChip priority={v as Priority} />}
            disabled={readOnly}
          >
            {PRIORITY_LIST.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                <PriorityChip priority={p.key} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* 创建者 + 跟进者（账号下拉，可为空；默认创建者=当前账户） */}
      <Stack direction="row" spacing={2}>
        <Autocomplete
          fullWidth
          size="small"
          freeSolo
          options={usernames}
          value={creator}
          onChange={(_, v) => setCreator(v ?? '')}
          onInputChange={(_, v) => setCreator(v)}
          disabled={readOnly}
          renderInput={(params) => (
            <TextField {...params} label="创建者" placeholder="默认当前账户" />
          )}
        />
        <Autocomplete
          fullWidth
          size="small"
          freeSolo
          options={usernames}
          value={owner}
          onChange={(_, v) => setOwner(v ?? '')}
          onInputChange={(_, v) => setOwner(v)}
          disabled={readOnly}
          renderInput={(params) => (
            <TextField {...params} label="跟进者" placeholder="可不填" />
          )}
        />
      </Stack>

      {/* 状态 + 截止日期 */}
      <Stack direction="row" spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>状态</InputLabel>
          <Select
            value={status}
            label="状态"
            onChange={(e) => setStatus(e.target.value as Status)}
            renderValue={(v) => <StatusChip status={v as Status} />}
            disabled={readOnly}
          >
            {STATUS_LIST.map((s) => (
              <MenuItem key={s.key} value={s.key}>
                <StatusChip status={s.key} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="截止日期"
          type="date"
          fullWidth
          size="small"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={readOnly}
        />
      </Stack>

      {/* 标签 */}
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={allTags}
        value={tags}
        onChange={(_, newVal) => setTags(newVal as string[])}
        disabled={readOnly}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              size="small"
              {...getTagProps({ index })}
              sx={{ borderRadius: 1.5 }}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="标签"
            placeholder="输入后回车添加"
          />
        )}
      />

      {error && <FormHelperText error>{error}</FormHelperText>}

      {/* 操作按钮 */}
      <Box className="flex justify-end gap-2" sx={{ mt: 1 }}>
        <Button onClick={onCancel} color="inherit">
          {readOnly ? '关闭' : '取消'}
        </Button>
        {!readOnly && (
          <Button type="submit" variant="contained" color="primary">
            保存
          </Button>
        )}
      </Box>
    </Box>
  );
}
