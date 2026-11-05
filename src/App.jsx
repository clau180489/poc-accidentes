import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, BitmapLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TileLayer } from '@deck.gl/geo-layers';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const COLORES = {
  Alta: [255, 77, 109],
  Media: [255, 184, 77],
  Baja: [56, 217, 169],
};

const VISTA = { longitude: -58.48, latitude: -34.63, zoom: 10.3, pitch: 0 };
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function App() {
  const [datos, setDatos] = useState([]);
  const [verCalor, setVerCalor] = useState(false);
  const [filtro, setFiltro] = useState({ Alta: true, Media: true, Baja: true });
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('puntos').select('*').then(({ data, error }) => {
      if (error) setError(error.message);
      else setDatos(data || []);
    });
  }, []);

  const visibles = useMemo(
    () => datos.filter((d) => filtro[d.categoria]),
    [datos, filtro]
  );

  const conteo = useMemo(() => {
    const c = { Alta: 0, Media: 0, Baja: 0 };
    datos.forEach((d) => c[d.categoria] !== undefined && c[d.categoria]++);
    return c;
  }, [datos]);

  const promedio = datos.length
    ? (datos.reduce((s, d) => s + Number(d.valor), 0) / datos.length).toFixed(1)
    : '–';

  const capas = [
    new TileLayer({
      id: 'mapa-base',
                data: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: (props) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    }),
        new TileLayer({
      id: 'etiquetas',
      data: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: (props) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    }),
    verCalor
      ? new HeatmapLayer({
          id: 'calor',
          data: visibles,
          getPosition: (d) => [d.longitud, d.latitud],
          getWeight: (d) => Number(d.valor),
          radiusPixels: 60,
          colorRange: [
            [56, 217, 169], [140, 220, 120], [255, 220, 90],
            [255, 184, 77], [255, 120, 90], [255, 77, 109],
          ],
        })
      : new ScatterplotLayer({
          id: 'puntos',
          data: visibles,
          getPosition: (d) => [d.longitud, d.latitud],
          getFillColor: (d) => [...(COLORES[d.categoria] || [180, 180, 180]), 190],
          getLineColor: (d) => [...(COLORES[d.categoria] || [180, 180, 180]), 255],
          getRadius: (d) => Number(d.valor) * 3,
          radiusMinPixels: 5,
          radiusMaxPixels: 22,
          stroked: true,
          lineWidthMinPixels: 1.5,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
        }),
  ];

  const s = {
    panel: {
      position: 'absolute', top: 20, left: 20, width: 300, padding: 20,
      background: 'rgba(15, 18, 30, 0.82)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
      color: '#e8eaf2', fontFamily: "'Segoe UI', Inter, sans-serif",
      boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
    },
    titulo: { margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: 0.3 },
    sub: { margin: '4px 0 16px', fontSize: 12, color: '#9aa0b4' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
    kpi: {
      background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px',
    },
    kpiNum: { fontSize: 22, fontWeight: 700 },
    kpiLbl: { fontSize: 11, color: '#9aa0b4', textTransform: 'uppercase', letterSpacing: 0.8 },
    fila: (c, on) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
      background: on ? css(c, 0.12) : 'transparent',
      border: `1px solid ${on ? css(c, 0.5) : 'rgba(255,255,255,0.08)'}`,
      opacity: on ? 1 : 0.45, fontSize: 13, transition: 'all .2s',
    }),
    boton: {
      width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: 'none',
      background: 'linear-gradient(135deg, #6c5ce7, #a463f5)', color: 'white',
      fontWeight: 600, cursor: 'pointer', fontSize: 13,
    },
    pie: { marginTop: 14, fontSize: 11, color: '#6f7590', lineHeight: 1.5 },
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0e17' }}>
      <DeckGL
        initialViewState={VISTA}
        controller={true}
        layers={capas}
        getTooltip={({ object }) =>
          object && {
            html: `<div style="font-weight:600;margin-bottom:4px">${object.nombre}</div>
                   <div>Gravedad: <b style="color:${css(COLORES[object.categoria] || [200,200,200])}">${object.categoria}</b></div>
                   <div>Índice: ${object.valor}</div>
                   <div style="color:#9aa0b4;margin-top:4px">${object.descripcion}</div>`,
            style: {
              background: 'rgba(15,18,30,0.95)', color: '#e8eaf2', borderRadius: '10px',
              padding: '10px 12px', fontFamily: "'Segoe UI', sans-serif", fontSize: '12px',
              maxWidth: '280px', border: '1px solid rgba(255,255,255,0.1)',
            },
          }
        }
      />

      <div style={s.panel}>
        <h1 style={s.titulo}>Accidentes de tránsito · AMBA</h1>
        <p style={s.sub}>Prueba de Concepto · Datos georreferenciados</p>

        <div style={s.grid}>
          <div style={s.kpi}>
            <div style={s.kpiNum}>{datos.length}</div>
            <div style={s.kpiLbl}>Siniestros</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiNum}>{promedio}</div>
            <div style={s.kpiLbl}>Índice prom.</div>
          </div>
        </div>

        {Object.keys(COLORES).map((k) => (
          <div key={k} style={s.fila(COLORES[k], filtro[k])}
               onClick={() => setFiltro({ ...filtro, [k]: !filtro[k] })}>
            <span>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: css(COLORES[k]), boxShadow: `0 0 8px ${css(COLORES[k])}`, marginRight: 8 }} />
              Gravedad {k}
            </span>
            <b>{conteo[k]}</b>
          </div>
        ))}

        <button style={s.boton} onClick={() => setVerCalor(!verCalor)}>
          {verCalor ? 'Ver puntos' : 'Ver mapa de calor'}
        </button>

        {error && <div style={{ color: '#ff4d6d', marginTop: 10, fontSize: 12 }}>Error: {error}</div>}

        <div style={s.pie}>
          Claudio Alfredo Abregu · ISFT N.º 199<br />
          Logística II · Prof. Gabriel Pintos<br />
          Supabase + React/Vite + deck.gl + Vercel
        </div>
      </div>
    </div>
  );
}