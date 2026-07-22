import { useEffect, useState } from "react";
import {
  SecLabDescriptions,
  SecLabButton,
  SecLabEmpty,
  SecLabLoading,
  SecLabTabs,
} from "@seclab-dev/react";
import type { PacketDetail } from "../types";
import { HexDump } from "./HexDump";

interface PacketDetailDrawerProps {
  visible: boolean;
  title: string;
  loading: boolean;
  detail: PacketDetail | null;
  anomalies?: string | null;
  labels: {
    empty: string;
    summary: string;
    insights: string;
    insightsEmpty: string;
    protocolTree: string;
    hex: string;
    noHex: string;
    close: string;
    sendToBuilder: string;
    followStream: string;
    anomaliesLabel: string;
  };
  onClose: () => void;
  onSendToBuilder: (detail: PacketDetail) => void;
  onFollowStream: (packetIndex: number) => void;
}

function toBytes(value: string) {
  return Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}

function toHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

function decodeDnsName(bytes: number[]) {
  const labels: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const length = bytes[offset];
    if (length === 0) {
      return labels.length > 0 ? labels.join(".") : null;
    }
    if (length > 63 || offset + length >= bytes.length) return null;

    const labelBytes = bytes.slice(offset + 1, offset + 1 + length);
    if (!labelBytes.every((byte) => byte >= 32 && byte <= 126)) return null;
    labels.push(String.fromCharCode(...labelBytes));
    offset += length + 1;
  }

  return null;
}

function decodeBinaryString(value: string) {
  const bytes = toBytes(value);
  const dnsName = decodeDnsName(bytes);
  const printable = bytes
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "."))
    .join("");

  if (dnsName) {
    return `DNS Name: ${dnsName}\nHex: ${toHex(bytes)}`;
  }

  return `Text: ${printable}\nHex: ${toHex(bytes)}`;
}

function formatFieldValue(value: unknown) {
  if (typeof value === "string") {
    const hasControlChar = Array.from(value).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    });
    return hasControlChar ? decodeBinaryString(value) : value;
  }
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function PacketDetailDrawer({
  visible,
  title,
  loading,
  detail,
  anomalies,
  labels,
  onClose,
  onSendToBuilder,
  onFollowStream,
}: PacketDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("protocol");
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab("protocol");
      setInsightsExpanded(false);
    }
  }, [visible, detail?.index]);

  if (!visible) return null;

  const isTcpOrUdp = detail?.layers.some((l) => l.name === "TCP" || l.name === "UDP");

  return (
    <div className="packet-overlay" data-ui="packet-detail-dialog" role="presentation">
      <div className="packet-dialog packet-detail-dialog" role="dialog" aria-modal="true">
        <div className="packet-dialog-header">
          <h3 className="packet-dialog-title">{title}</h3>
          <div className="packet-actions" style={{ display: "flex", gap: "8px" }}>
            {detail && isTcpOrUdp && (
              <SecLabButton type="primary" size="small" onClick={() => onFollowStream(detail.index)}>
                {labels.followStream}
              </SecLabButton>
            )}
            {detail && (
              <SecLabButton type="secondary" size="small" onClick={() => onSendToBuilder(detail)}>
                {labels.sendToBuilder}
              </SecLabButton>
            )}
            <SecLabButton type="secondary" size="small" onClick={onClose}>
              {labels.close}
            </SecLabButton>
          </div>
        </div>
        <div className="packet-dialog-body packet-detail-body" data-ui="packet-detail">
          {loading ? (
            <SecLabLoading loading text={labels.empty} />
          ) : !detail ? (
            <SecLabEmpty description={labels.empty} />
          ) : (
            <>
              {anomalies && (
                <div style={{
                  backgroundColor: "#fffbe6",
                  border: "1px solid #ffe58f",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  color: "#d46b08",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>⚠️ <strong>{labels.anomaliesLabel}</strong></span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {anomalies.split(",").map((anomaly) => (
                      <span key={anomaly} style={{
                        backgroundColor: "#ffe58f",
                        borderRadius: "2px",
                        padding: "2px 6px",
                        fontWeight: 600,
                        fontSize: "11px"
                      }}>
                        {anomaly}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="packet-section">
                <div className="packet-section-title">{labels.summary}</div>
                <div className="packet-summary-box">{detail.summary}</div>
              </div>

              <div className="packet-section">
                <button
                  type="button"
                  className="packet-section-toggle"
                  aria-expanded={insightsExpanded}
                  onClick={() => setInsightsExpanded((expanded) => !expanded)}
                >
                  <span>{labels.insights}</span>
                  <span className="packet-section-toggle-icon" aria-hidden="true" />
                </button>
                {insightsExpanded && (
                  detail.protocol_insights.length > 0 ? (
                    <div className="packet-protocol-list">
                      {detail.protocol_insights.map((insight, index) => (
                        <SecLabDescriptions
                          border
                          column={1}
                          className="packet-layer-descriptions"
                          title={`${index + 1}. ${insight.title} (${insight.protocol})`}
                          items={Object.entries(insight.fields).map(([key, value]) => ({
                            label: key,
                            value: formatFieldValue(value),
                          }))}
                          key={`${insight.protocol}-${index}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="packet-summary-box">{labels.insightsEmpty}</div>
                  )
                )}
              </div>

              <div className="packet-detail-tabs">
                <SecLabTabs
                  value={activeTab}
                  onChange={setActiveTab}
                  tabs={[
                    { name: "protocol", label: labels.protocolTree },
                    { name: "hex", label: labels.hex },
                  ]}
                />
              </div>

              <div className="packet-detail-tab-body">
                {activeTab === "protocol" ? (
                  <div className="packet-section packet-protocol-section">
                    <div className="packet-protocol-list">
                      {detail.layers.map((layer, index) => (
                        <SecLabDescriptions
                          border
                          column={1}
                          className="packet-layer-descriptions"
                          title={`${index + 1}. ${layer.name}`}
                          items={Object.entries(layer.fields).map(([key, value]) => ({
                            label: key,
                            value: formatFieldValue(value),
                          }))}
                          key={`${layer.name}-${index}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="packet-section packet-hex-section">
                    <HexDump hex={detail.hex} emptyText={labels.noHex} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
