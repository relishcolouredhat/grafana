import React, { PureComponent } from 'react';

import {
  rangeUtil,
  RawTimeRange,
  LogLevel,
  TimeZone,
  AbsoluteTimeRange,
  LogsMetaKind,
  LogsDedupStrategy,
  LogRowModel,
  LogsDedupDescription,
  LogsMetaItem,
  GraphSeriesXY,
  LinkModel,
  Field,
} from '@grafana/data';
import { LegacyForms, LogLabels, ToggleButtonGroup, ToggleButton, LogRows, Button } from '@grafana/ui';
const { Switch } = LegacyForms;
import store from 'app/core/store';

import { ExploreGraphPanel } from './ExploreGraphPanel';
import { MetaInfoText } from './MetaInfoText';
import { RowContextOptions } from '@grafana/ui/src/components/Logs/LogRowContextProvider';

const SETTINGS_KEYS = {
  showLabels: 'grafana.explore.logs.showLabels',
  showTime: 'grafana.explore.logs.showTime',
  wrapLogMessage: 'grafana.explore.logs.wrapLogMessage',
};

function renderMetaItem(value: any, kind: LogsMetaKind) {
  if (kind === LogsMetaKind.LabelsMap) {
    return (
      <span className="logs-meta-item__labels">
        <LogLabels labels={value} />
      </span>
    );
  }
  return value;
}

interface Props {
  logRows?: LogRowModel[];
  logsMeta?: LogsMetaItem[];
  logsSeries?: GraphSeriesXY[];
  dedupedRows?: LogRowModel[];
  visibleRange?: AbsoluteTimeRange;

  width: number;
  highlighterExpressions?: string[];
  loading: boolean;
  absoluteRange: AbsoluteTimeRange;
  timeZone: TimeZone;
  scanning?: boolean;
  scanRange?: RawTimeRange;
  dedupStrategy: LogsDedupStrategy;
  showContextToggle?: (row?: LogRowModel) => boolean;
  onChangeTime: (range: AbsoluteTimeRange) => void;
  onClickFilterLabel?: (key: string, value: string) => void;
  onClickFilterOutLabel?: (key: string, value: string) => void;
  onStartScanning?: () => void;
  onStopScanning?: () => void;
  onDedupStrategyChange: (dedupStrategy: LogsDedupStrategy) => void;
  onToggleLogLevel: (hiddenLogLevels: LogLevel[]) => void;
  getRowContext?: (row: LogRowModel, options?: RowContextOptions) => Promise<any>;
  getFieldLinks: (field: Field, rowIndex: number) => Array<LinkModel<Field>>;
}

interface State {
  showLabels: boolean;
  showTime: boolean;
  wrapLogMessage: boolean;
}

export class Logs extends PureComponent<Props, State> {
  state = {
    showLabels: store.getBool(SETTINGS_KEYS.showLabels, false),
    showTime: store.getBool(SETTINGS_KEYS.showTime, true),
    wrapLogMessage: store.getBool(SETTINGS_KEYS.wrapLogMessage, true),
  };

  onChangeDedup = (dedup: LogsDedupStrategy) => {
    const { onDedupStrategyChange } = this.props;
    if (this.props.dedupStrategy === dedup) {
      return onDedupStrategyChange(LogsDedupStrategy.none);
    }
    return onDedupStrategyChange(dedup);
  };

  onChangeLabels = (event?: React.SyntheticEvent) => {
    const target = event && (event.target as HTMLInputElement);
    if (target) {
      const showLabels = target.checked;
      this.setState({
        showLabels,
      });
      store.set(SETTINGS_KEYS.showLabels, showLabels);
    }
  };

  onChangeTime = (event?: React.SyntheticEvent) => {
    const target = event && (event.target as HTMLInputElement);
    if (target) {
      const showTime = target.checked;
      this.setState({
        showTime,
      });
      store.set(SETTINGS_KEYS.showTime, showTime);
    }
  };

  onChangewrapLogMessage = (event?: React.SyntheticEvent) => {
    const target = event && (event.target as HTMLInputElement);
    if (target) {
      const wrapLogMessage = target.checked;
      this.setState({
        wrapLogMessage,
      });
      store.set(SETTINGS_KEYS.wrapLogMessage, wrapLogMessage);
    }
  };

  onToggleLogLevel = (hiddenRawLevels: string[]) => {
    const hiddenLogLevels: LogLevel[] = hiddenRawLevels.map(level => LogLevel[level as LogLevel]);
    this.props.onToggleLogLevel(hiddenLogLevels);
  };

  onClickScan = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (this.props.onStartScanning) {
      this.props.onStartScanning();
    }
  };

  onClickStopScan = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (this.props.onStopScanning) {
      this.props.onStopScanning();
    }
  };

  render() {
    const {
      logRows,
      logsMeta,
      logsSeries,
      visibleRange,
      highlighterExpressions,
      loading = false,
      onClickFilterLabel,
      onClickFilterOutLabel,
      timeZone,
      scanning,
      scanRange,
      showContextToggle,
      width,
      dedupedRows,
      absoluteRange,
      onChangeTime,
      getFieldLinks,
    } = this.props;

    if (!logRows) {
      return null;
    }

    const { showLabels, showTime, wrapLogMessage } = this.state;
    const { dedupStrategy } = this.props;
    const hasData = logRows && logRows.length > 0;
    const dedupCount = dedupedRows
      ? dedupedRows.reduce((sum, row) => (row.duplicates ? sum + row.duplicates : sum), 0)
      : 0;
    const meta = logsMeta ? [...logsMeta] : [];

    if (dedupStrategy !== LogsDedupStrategy.none) {
      meta.push({
        label: 'Dedup count',
        value: dedupCount,
        kind: LogsMetaKind.Number,
      });
    }

    const scanText = scanRange ? `Scanning ${rangeUtil.describeTimeRange(scanRange)}` : 'Scanning...';
    const series = logsSeries ? logsSeries : [];

    return (
      <div className="logs-panel">
        <div className="logs-panel-graph">
          <ExploreGraphPanel
            series={series}
            width={width}
            onHiddenSeriesChanged={this.onToggleLogLevel}
            loading={loading}
            absoluteRange={visibleRange || absoluteRange}
            isStacked={true}
            showPanel={false}
            showingGraph={true}
            showingTable={true}
            timeZone={timeZone}
            showBars={true}
            showLines={false}
            onUpdateTimeRange={onChangeTime}
          />
        </div>
        <div className="logs-panel-options">
          <div className="logs-panel-controls">
            <Switch label="Time" checked={showTime} onChange={this.onChangeTime} transparent />
            <Switch label="Unique labels" checked={showLabels} onChange={this.onChangeLabels} transparent />
            <Switch label="Wrap lines" checked={wrapLogMessage} onChange={this.onChangewrapLogMessage} transparent />
            <ToggleButtonGroup label="Dedup" transparent={true}>
              {Object.keys(LogsDedupStrategy).map((dedupType: string, i) => (
                <ToggleButton
                  key={i}
                  value={dedupType}
                  onChange={this.onChangeDedup}
                  selected={dedupStrategy === dedupType}
                  // @ts-ignore
                  tooltip={LogsDedupDescription[dedupType]}
                >
                  {dedupType}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </div>

        {meta && (
          <MetaInfoText
            metaItems={meta.map(item => {
              return {
                label: item.label,
                value: renderMetaItem(item.value, item.kind),
              };
            })}
          />
        )}

        <LogRows
          logRows={logRows}
          deduplicatedRows={dedupedRows}
          dedupStrategy={dedupStrategy}
          getRowContext={this.props.getRowContext}
          highlighterExpressions={highlighterExpressions}
          rowLimit={logRows ? logRows.length : undefined}
          onClickFilterLabel={onClickFilterLabel}
          onClickFilterOutLabel={onClickFilterOutLabel}
          showContextToggle={showContextToggle}
          showLabels={showLabels}
          showTime={showTime}
          wrapLogMessage={wrapLogMessage}
          timeZone={timeZone}
          getFieldLinks={getFieldLinks}
        />

        {!loading && !hasData && !scanning && (
          <div className="logs-panel-nodata">
            No logs found.
            <Button size="xs" variant="link" onClick={this.onClickScan}>
              Scan for older logs
            </Button>
          </div>
        )}

        {scanning && (
          <div className="logs-panel-nodata">
            <span>{scanText}</span>
            <Button size="xs" variant="link" onClick={this.onClickStopScan}>
              Stop scan
            </Button>
          </div>
        )}
      </div>
    );
  }
}
