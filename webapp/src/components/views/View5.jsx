import { useCallback, useMemo, useRef } from "react";
import { Layers } from "lucide-react";
import { useAppStore } from "../../store/appStore.js";
import { districts } from "../../data/districts.js";
import { useI18n } from "../../i18n/useI18n.js";
import { ViewIntro } from "../layout/ViewIntro.jsx";
import { ContextBanner } from "../layout/ContextBanner.jsx";
import { PanelCard } from "../ui/PanelCard.jsx";
import { LayerOption } from "../ui/LayerOption.jsx";
import { RichText } from "../ui/RichText.jsx";
import { DistrictMapCard } from "../map/DistrictMapCard.jsx";
import { DistrictTable } from "../panels/DistrictTable.jsx";
import { DistrictDetail, MetricInfo } from "../panels/DistrictDetail.jsx";
import { AreaFinder } from "../panels/AreaFinder.jsx";

const FINDER_ANCHOR_ID = "view5-area-finder";

// View 5 — Cluj-Napoca cartier (neighbourhood) aggregation. Single layer; no
// aggregation toggle. Cartiere are derived by classifying the official UTR
// polygons against the nearest OSM place=suburb centroid (see build_cartiere.mjs).

export function View5() {
  const { data, language } = useI18n();
  const view5Metric = useAppStore((state) => state.view5Metric);
  const selectedDistrictId = useAppStore((state) => state.selectedDistrictId);
  const setState = useAppStore((state) => state.setState);

  const metric = data.districtMetrics[view5Metric];
  const view5Aggregation = "district";
  const entities = districts;
  const mapRef = useRef(null);
  const handleZoomToFeature = useCallback((featureId) => {
    mapRef.current?.flyTo?.(featureId);
  }, []);

  const sorted = useMemo(
    () => [...entities].sort((a, b) => (b[view5Metric] ?? -Infinity) - (a[view5Metric] ?? -Infinity)),
    [entities, view5Metric],
  );
  const selected = entities.find((entity) => entity.id === selectedDistrictId) || null;
  const rank = selected ? sorted.findIndex((entity) => entity.id === selected.id) + 1 : 0;
  const copy = language !== "it"
    ? {
      metricDetail: selected ? `${selected.name} · 2026` : "Pick a cartier to read its 2026 value",
      missingValue: "n/a",
      bannerLabel: "2026 data",
      bannerValue: `${entities.length} cartiere`,
      bannerText:
        "This view aggregates **2026** summer data by **cartier** (Cluj-Napoca neighbourhood). Cartier boundaries are approximated by classifying the official UTR polygons against the nearest OSM neighbourhood centroid.",
      panelTitle: "2026 reading",
      cartierHelp: "Each cartier groups the UTR polygons closest to its OSM centroid; pick one to compare its 2026 values against the others.",
      inspectHelp:
        "To choose a cartier from the map, enable **Inspect** in the controls below the map and then click the area.",
    }
    : {
      metricDetail: selected ? `${selected.name} · 2026` : "Scegli un cartier per leggere il valore 2026",
      missingValue: "n.d.",
      bannerLabel: "Dati 2026",
      bannerValue: `${entities.length} cartiere`,
      bannerText:
        "Questa sezione aggrega i dati estivi **2026** per **cartier** (quartiere di Cluj-Napoca). I confini dei cartiere sono approssimati classificando i poligoni UTR ufficiali in base al centroide OSM più vicino.",
      panelTitle: "Lettura 2026",
      cartierHelp: "Ogni cartier raggruppa i poligoni UTR più vicini al suo centroide OSM: selezionane uno per confrontarne i valori 2026 con gli altri.",
      inspectHelp:
        "Per scegliere un cartier dalla mappa, attiva **Ispeziona** nei controlli sotto la mappa e poi clicca l'area.",
    };

  return (
    <>
      <ViewIntro
        id="v5"
        metric={{
          label: metric.label,
          value: `${selected?.[view5Metric] ?? copy.missingValue}${metric.unit}`,
          detail: copy.metricDetail,
        }}
      />
      <ContextBanner
        label={copy.bannerLabel}
        value={copy.bannerValue}
        text={copy.bannerText}
      />
      <div className="main-grid">
        <div className="map-stack">
          <DistrictMapCard
            ref={mapRef}
            aggregation={view5Aggregation}
            entities={entities}
            metricKey={view5Metric}
            selectedId={selected?.id}
            infoTargetId="view5-info"
            finderAnchorId={FINDER_ANCHOR_ID}
            onSelect={(id) => {
              setState({ selectedDistrictId: id });
            }}
          />
          <AreaFinder id={FINDER_ANCHOR_ID} onZoomToFeature={handleZoomToFeature} />
          <DistrictTable
            sorted={sorted}
            metricKey={view5Metric}
            selectedId={selected?.id}
            aggregation={view5Aggregation}
            onSelect={(id) => {
              setState({ selectedDistrictId: id });
              handleZoomToFeature(id);
            }}
          />
        </div>
        <aside className="side-panel">
          <PanelCard id="view5-info" className="info-target" title={copy.panelTitle} icon={<Layers size={16} />}>
            <p className="panel-help">{copy.cartierHelp}</p>
            <RichText as="p" className="panel-help" text={copy.inspectHelp} />
            {Object.entries(data.districtMetrics).map(([key, item]) => (
              <LayerOption
                key={key}
                selected={view5Metric === key}
                title={item.label}
                body={item.description}
                onClick={() => setState({ view5Metric: key })}
              />
            ))}
            <MetricInfo metric={metric} />
          </PanelCard>
          {selected && (
            <DistrictDetail
              district={selected}
              rank={rank}
              metricKey={view5Metric}
              aggregation={view5Aggregation}
            />
          )}
        </aside>
      </div>
    </>
  );
}

