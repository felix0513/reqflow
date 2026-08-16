import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Button,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { PRIORITY_LIST, STATUS_LIST } from '@/constants/index';
import type { FilterState, Category, Priority, Status } from '@/types';

export interface FilterBarProps {
  filter: FilterState;
  categories: Category[];
  allTags: string[];
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

const ITEM_HEIGHT = 48;
const MenuProps = {
  PaperProps: {
    style: { maxHeight: ITEM_HEIGHT * 6, width: 200 },
  },
};

/**
 * 多条件筛选栏：分类 / 优先级 / 状态 / 标签
 * 各维度均为多选（OR），维度间为 AND
 */
export function FilterBar({
  filter,
  categories,
  allTags,
  onChange,
  onReset,
}: FilterBarProps) {
  const hasActiveFilter =
    filter.categoryIds.length > 0 ||
    filter.priorities.length > 0 ||
    filter.statuses.length > 0 ||
    filter.tags.length > 0;

  return (
    <Box className="flex flex-wrap items-center gap-2">
      <FilterListIcon sx={{ color: 'text.secondary', fontSize: 20 }} />

      {/* 分类筛选 */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>分类</InputLabel>
        <Select
          multiple
          value={filter.categoryIds}
          onChange={(e) =>
            onChange({ categoryIds: e.target.value as string[] })
          }
          input={<OutlinedInput label="分类" />}
          renderValue={(selected) =>
            (selected as string[])
              .map(
                (id) =>
                  categories.find((c) => c.id === id)?.name ?? '未知',
              )
              .join('、')
          }
          MenuProps={MenuProps}
          sx={{ borderRadius: 8 }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              <Checkbox
                checked={filter.categoryIds.includes(cat.id)}
                size="small"
              />
              <ListItemText primary={cat.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 优先级筛选 */}
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>优先级</InputLabel>
        <Select
          multiple
          value={filter.priorities}
          onChange={(e) =>
            onChange({ priorities: e.target.value as Priority[] })
          }
          input={<OutlinedInput label="优先级" />}
          renderValue={(selected) =>
            (selected as Priority[])
              .map((p) => PRIORITY_META_LABEL[p])
              .join('、')
          }
          MenuProps={MenuProps}
          sx={{ borderRadius: 8 }}
        >
          {PRIORITY_LIST.map((p) => (
            <MenuItem key={p.key} value={p.key}>
              <Checkbox
                checked={filter.priorities.includes(p.key)}
                size="small"
              />
              <ListItemText primary={`${p.key} ${p.label}`} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 状态筛选 */}
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>状态</InputLabel>
        <Select
          multiple
          value={filter.statuses}
          onChange={(e) => onChange({ statuses: e.target.value as Status[] })}
          input={<OutlinedInput label="状态" />}
          renderValue={(selected) =>
            (selected as Status[])
              .map((s) => STATUS_LIST.find((m) => m.key === s)?.label ?? s)
              .join('、')
          }
          MenuProps={MenuProps}
          sx={{ borderRadius: 8 }}
        >
          {STATUS_LIST.map((s) => (
            <MenuItem key={s.key} value={s.key}>
              <Checkbox
                checked={filter.statuses.includes(s.key)}
                size="small"
              />
              <ListItemText primary={s.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>标签</InputLabel>
          <Select
            multiple
            value={filter.tags}
            onChange={(e) => onChange({ tags: e.target.value as string[] })}
            input={<OutlinedInput label="标签" />}
            renderValue={(selected) => (selected as string[]).join('、')}
            MenuProps={MenuProps}
            sx={{ borderRadius: 8 }}
          >
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                <Checkbox
                  checked={filter.tags.includes(tag)}
                  size="small"
                />
                <ListItemText primary={tag} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* 已选条件标识 */}
      {hasActiveFilter && (
        <Chip
          label="筛选中"
          size="small"
          color="primary"
          variant="outlined"
          onDelete={onReset}
        />
      )}

      {hasActiveFilter && (
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          color="inherit"
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          重置
        </Button>
      )}
    </Box>
  );
}

// 优先级标签映射（用于 renderValue）
const PRIORITY_META_LABEL: Record<Priority, string> = {
  P0: '紧急',
  P1: '高',
  P2: '中',
  P3: '低',
};
