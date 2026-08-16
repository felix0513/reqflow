import { useMemo } from 'react';
import { Box, FormControl, Select, MenuItem, Typography, Chip } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { getVersionHistory, VERSION_CHANGE_LABELS, VERSION_CHANGE_COLORS } from '@/services/versioning';
import { formatDateTime } from '@/constants/format';

export interface VersionSelectorProps {
  requirementId: string;
  currentVersion: string;
}

/**
 * 版本选择器：下拉菜单选择不同版本查看
 * 选择历史版本后，抽屉表单切换为只读模式
 */
export function VersionSelector({ requirementId, currentVersion }: VersionSelectorProps) {
  const { state, dispatch } = useRequirements();

  const history = useMemo(
    () => getVersionHistory(state.requirementVersions, requirementId),
    [state.requirementVersions, requirementId],
  );

  const selectedValue = state.viewingVersionId ?? 'latest';

  const handleChange = (value: string) => {
    if (value === 'latest') {
      dispatch({ type: 'VERSION_VIEW_SET', payload: null });
    } else {
      dispatch({ type: 'VERSION_VIEW_SET', payload: value });
    }
  };

  return (
    <FormControl fullWidth size="small">
      <Select
        value={selectedValue}
        onChange={(e) => handleChange(e.target.value)}
        renderValue={(v) => {
          if (v === 'latest') {
            return (
              <Box className="flex items-center gap-1.5">
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                >
                  v{currentVersion}
                </Typography>
                <Chip label="最新" size="small" color="primary" sx={{ height: 18, fontSize: 11 }} />
              </Box>
            );
          }
          const version = history.find((ver) => ver.id === v);
          if (!version) return `v${currentVersion}`;
          return (
            <Box className="flex items-center gap-1.5">
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontFamily: 'monospace' }}
              >
                v{version.version}
              </Typography>
              <Chip
                label={VERSION_CHANGE_LABELS[version.changeType]}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 11,
                  bgcolor: VERSION_CHANGE_COLORS[version.changeType],
                  color: '#fff',
                }}
              />
            </Box>
          );
        }}
        sx={{
          '& .MuiSelect-select': { py: 0.75 },
        }}
      >
        {/* 最新版本（当前编辑版本） */}
        <MenuItem value="latest">
          <Box className="flex items-center gap-1.5">
            <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              v{currentVersion}
            </Typography>
            <Chip label="最新" size="small" color="primary" sx={{ height: 18, fontSize: 11 }} />
          </Box>
        </MenuItem>

        {/* 历史版本列表 */}
        {history.map((version) => (
          <MenuItem key={version.id} value={version.id}>
            <Box sx={{ width: '100%' }}>
              <Box className="flex items-center gap-1">
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                  v{version.version}
                </Typography>
                <Chip
                  label={VERSION_CHANGE_LABELS[version.changeType]}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 10,
                    bgcolor: VERSION_CHANGE_COLORS[version.changeType],
                    color: '#fff',
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 11 }}>
                {version.changeSummary} · {formatDateTime(version.createdAt)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
