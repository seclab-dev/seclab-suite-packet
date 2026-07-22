import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import {
  SecLabButton,
  SecLabEmpty,
  SecLabLoading,
  SecLabTable,
  type SecLabTableColumn,
} from "@seclab-dev/react";
import type { StatsData } from "../types";

interface StatsDialogProps {
  visible: boolean;
  loading: boolean;
  stats: StatsData | null;
  labels: {
    title: string;
    loading: string;
    chartTitle: string;
    seriesName: string;
    topSrc: string;
    topDst: string;
    topPorts: string;
    total: string;
    ip: string;
    count: string;
    port: string;
    connections: string;
    empty: string;
    close: string;
  };
  onClose: () => void;
}

export function StatsDialog({
  visible,
  loading,
  stats,
  labels,
  onClose,
}: StatsDialogProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !stats || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      title: {
        text: labels.chartTitle,
        left: "center",
        textStyle: { color: "var(--sdl-text-title)", fontSize: 15 },
      },
      tooltip: { trigger: "item" },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: "var(--sdl-text-secondary)" },
      },
      series: [
        {
          name: labels.seriesName,
          type: "pie",
          radius: "56%",
          center: ["50%", "46%"],
          data: Object.entries(stats.protocol_distribution).map(([name, value]) => ({
            name,
            value,
          })),
        },
      ],
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [labels.chartTitle, labels.seriesName, stats, visible]);

  if (!visible) return null;

  const ipColumns: SecLabTableColumn<{ ip: string; count: number }>[] = [
    { prop: "ip", label: labels.ip },
    { prop: "count", label: labels.count, width: 120, align: "right" },
  ];
  const portColumns: SecLabTableColumn<{ port: number; count: number }>[] = [
    { prop: "port", label: labels.port },
    { prop: "count", label: labels.connections, width: 120, align: "right" },
  ];

  return (
    <div className="packet-overlay" data-ui="stats-dialog" role="presentation">
      <div className="packet-dialog packet-stats-dialog" role="dialog" aria-modal="true">
        <div className="packet-dialog-header">
          <h3 className="packet-dialog-title">{labels.title}</h3>
          <SecLabButton type="secondary" size="small" onClick={onClose}>
            {labels.close}
          </SecLabButton>
        </div>
        <div className="packet-dialog-body">
          {loading ? (
            <SecLabLoading loading text={labels.loading} />
          ) : !stats ? (
            <SecLabEmpty description={labels.empty} />
          ) : (
            <>
              <div className="packet-total-line">
                {labels.total} <strong>{stats.total_packets}</strong>
              </div>
              <div className="chart-container" ref={chartRef} />
              <div className="packet-stats-grid">
                <div className="packet-card">
                  <h4>{labels.topSrc}</h4>
                  <div className="packet-card-table">
                    <SecLabTable data={stats.top_src_ips} columns={ipColumns} border />
                  </div>
                </div>
                <div className="packet-card">
                  <h4>{labels.topDst}</h4>
                  <div className="packet-card-table">
                    <SecLabTable data={stats.top_dst_ips} columns={ipColumns} border />
                  </div>
                </div>
                <div className="packet-card">
                  <h4>{labels.topPorts}</h4>
                  <div className="packet-card-table">
                    <SecLabTable data={stats.top_dst_ports} columns={portColumns} border />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
