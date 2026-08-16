import { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import {
  getVersionHistory,
  VERSION_CHANGE_LABELS,
  VERSION_CHANGE_COLORS,
} from '@/services/versioning';
import { formatDateTime } from '@/constants/format';

export interface VersionHistoryProps {
  requirementId: string;
}

/**
 * 版本历史时间线：可视化展示需求的所有版本变更记录
 * 点击某条记录可查看该版本的快照
 */
export function VersionHistory({ requirementId }: VersionHistoryProps) {
  const { state, dispatch } = useRequirements();
  const toast = useToast();

  const history = useMemo(
    () => getVersionHistory(state.requirementVersions, requirementId),
    [state.requirementVersions, requirementId],
  );

  const handleViewVersion = (versionId: string) => {
    dispatch({ type: 'VERSION_VIEW_SET', payload: versionId });
    const version = history.find((v) => v.id === versionId);
    if (version) {
      toast.info(`正在查看版本 ${version.version}`);
    }
  };

  const handleBackToLatest = () => {
    dispatch({ type: 'VERSION_VIEW_SET', payload: null });
    toast.info('已返回最新版本');
  };

  if (history.length === 0) {
    return (
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <HistoryIcon sx={{ color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          暂无版本历史
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box className="flex items-center justify-between" sx={{ mb: 1.5 }}>
        <Box className="flex items-center gap-1">
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            版本历史（{history.length}）
          </Typography>
        </Box>
        {state.viewingVersionId && (
          <Tooltip title="返回最新版本">
            <IconButton size="small" onClick={handleBackToLatest}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 时间线 */}
      <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
        {history.map((version, index) => {
          const isViewing = state.viewingVersionId === version.id;
          const isLatest = index === 0;
          const changeColor = VERSION_CHANGE_COLORS[version.changeType];
          const changeLabel = VERSION_CHANGE_LABELS[version.changeType];

          return (
            <Box key={version.id} sx={{ display: 'flex', gap: 1.5 }}>
              {/* 时间线轴线 + 节点 */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 20,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: changeColor,
                    border: '2px solid',
                    borderColor: isViewing ? 'primary.main' : 'background.paper',
                    boxShadow: isViewing ? '0 0 0 2px primary.main' : 'none',
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                />
                {index < history.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      bgcolor: 'divider',
                      minHeight: 20,
                    }}
                  />
                )}
              </Box>

              {/* 版本记录卡片 */}
              <Paper
                variant={isViewing ? 'outlined' : 'elevation'}
                elevation={isViewing ? 0 : 0}
                onClick={() => handleViewVersion(version.id)}
                sx={{
                  flex: 1,
                  mb: 1,
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  bgcolor: isViewing ? 'action.hover' : 'background.paper',
                  borderColor: isViewing ? 'primary.main' : 'divider',
                  border: isViewing ? '2px solid' : '1px solid',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {/* 版本号 + 变更类型 */}
                <Box className="flex items-center gap-1" sx={{ mb: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                  >
                    v{version.version}
                  </Typography>
                  <Chip
                    label={changeLabel}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 11,
                      bgcolor: changeColor,
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                  {isLatest && (
                    <Chip
                      label="最新"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 18, fontSize: 11 }}
                    />
                  )}
                </Box>

                {/* 变更摘要 */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.4 }}
                >
                  {version.changeSummary}
                </Typography>

                {/* 变更明细 */}
                {version.changes.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {version.changes.map((change, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.5,
                          fontSize: 11,
                          color: 'text.secondary',
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'text.primary',
                            minWidth: 48,
                          }}
                        >
                          {change.field}:
                        </Typography>
                        <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
                          <Box
                            component="span"
                            sx={{
                              textDecoration: 'line-through',
                              opacity: 0.6,
                            }}
                          >
                            {truncate(change.oldValue, 40)}
                          </Box>
                          {' → '}
                          <Box
                            component="span"
                            sx={{ color: 'primary.main', fontWeight: 600 }}
                          >
                            {truncate(change.newValue, 40)}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* 时间 */}
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    color: 'text.disabled',
                    fontSize: 10,
                  }}
                >
                  {formatDateTime(version.createdAt)}
                </Typography>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}
