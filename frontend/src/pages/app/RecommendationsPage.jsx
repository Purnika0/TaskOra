// src/pages/app/RecommendationsPage.jsx
//
// ML Integration: Collaborative Filtering (Cosine Similarity)
//   GET /api/ml/recommendations/
//   Response: { student, recommendations: [{ task_type, reason, similarity_score }], total }
//
// Backend type → Human label mapping (NO raw ML values exposed):
//   similar_users → "Trending"        (Collaborative Filtering)
//   cluster       → "Focus"           (K-Means)
//   outlier       → "Attention Needed" (Isolation Forest)
//
// Smart priority: rec with priority ≥ High AND due_date ≤ 48h
//   → moved to top + "Suggested" badge
//
// Deduplication: by task_type + type composite key
// Stable React keys: composite key, not array index

import React, { useMemo, useCallback } from 'react'
import { Link }                              from 'react-router-dom'
import { TrendingUp, Layers, AlertCircle, Star, Zap, RefreshCw } from 'lucide-react'
import { useRecommendations }                from '../../hooks/useAnalytics.js'
import { DashboardFooter }                   from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock }          from '../../components/shared/Loader.jsx'

// ── ML type → UI mapping ──────────────────────────────────────
// Cosine similarity output    → Trending
// K-Means cluster output      → Focus
// Isolation Forest output     → Attention Needed
const CATS = {
    similar_users: { label:'Trending',          icon:TrendingUp,  color:'#3b6fd4', bg:'#eff3fd' },
    cluster:       { label:'Focus',             icon:Layers,       color:'#d4a93c', bg:'#fdf5e6' },
    outlier:       { label:'Attention Needed',  icon:AlertCircle,  color:'#e05252', bg:'#fdf0f0' },
}
function getCat(type) { return CATS[type] || CATS.similar_users }

// ── Smart priority: high + due within 48 h ───────────────────
function isSuggested(rec) {
  // priority may be numeric (4-5) or string ("High") from backend
    const p = rec.priority
    const hi = p === 'High' || p === 'Critical' || Number(p) >= 4
    if (!hi || !rec.due_date) return false
    const msLeft = new Date(rec.due_date + 'T23:59:59') - Date.now()
    return msLeft >= 0 && msLeft / 3_600_000 <= 48
}

// ── Stable composite key — prevents duplicate rendering ──────
// function recKey(rec) {
//     return `${rec.task_type || 'unknown'}_${rec.type || 'similar_users'}`
// }
function recKey(rec) {
    return `${rec.task_id || rec.assignment_id || rec.task_type}_${rec.type || 'similar_users'}`
}

// ── Loading skeleton ─────────────────────────────────────────
function RecSkeleton() {
    return (
        <div style={{ background:'#fff', border:'1px solid #e8e3db', borderRadius:12, padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ height:20, width:'30%', background:'#f0ece5', borderRadius:99, animation:'to-pulseLoad 1.4s ease infinite' }}/>
        <div style={{ height:16, width:'80%', background:'#f0ece5', borderRadius:6, animation:'to-pulseLoad 1.4s ease infinite 0.1s' }}/>
        <div style={{ height:14, width:'100%', background:'#f0ece5', borderRadius:6, animation:'to-pulseLoad 1.4s ease infinite 0.2s' }}/>
        <div style={{ height:14, width:'65%', background:'#f0ece5', borderRadius:6, animation:'to-pulseLoad 1.4s ease infinite 0.3s' }}/>
        </div>
    )
}

    // ── Single recommendation card ───────────────────────────────
function RecCard({ rec }) {
    const cat       = getCat(rec.type)
    const Icon      = cat.icon
    const suggested = rec._suggested

    // Human-readable title — no raw ML values (task_type only)
    const title = rec.title
        || (rec.task_type
        ? rec.task_type.charAt(0).toUpperCase() + rec.task_type.slice(1) + ' Tasks'
        : 'Study Recommendation')

    return (
        <div
        style={{
            background:'#fff',
            border:`1px solid ${suggested ? '#fde68a' : '#e8e3db'}`,
            borderLeft:`4px solid ${suggested ? '#d4a93c' : cat.color}`,
            borderRadius:12, padding:'16px 18px',
            display:'flex', flexDirection:'column', gap:10,
            transition:'box-shadow 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 18px rgba(26,31,53,0.09)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
        {/* Category + Suggested badges */}
        <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'3px 9px', background:cat.bg, color:cat.color, borderRadius:99, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            <Icon size={10} aria-hidden="true"/> {cat.label}
            </span>
            {suggested && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'3px 9px', background:'#fffbeb', color:'#b45309', borderRadius:99, border:'1px solid #fde68a' }}>
                <Star size={9} aria-hidden="true"/> Suggested
            </span>
            )}
        </div>

        {/* Title */}
        <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0, lineHeight:1.35, letterSpacing:'-0.01em' }}>
            {title}
        </p>

        {/* Reason — human-readable only, no ML internals */}
        <p style={{ fontSize:12, color:'#6a5e4e', margin:0, lineHeight:1.65 }}>
            {rec.reason || 'Recommended based on your academic activity and study patterns.'}
        </p>
        </div>
    )
}

// ── Category section ─────────────────────────────────────────
function CatSection({ catKey, items }) {
    if (!items.length) return null
    const cat  = CATS[catKey]
    const Icon = cat.icon
    return (
        <section aria-label={cat.label}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Icon size={14} style={{ color:cat.color }} aria-hidden="true"/>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:0 }}>
            {cat.label}
            </h3>
            <span style={{ fontSize:10, background:cat.bg, color:cat.color, padding:'2px 7px', borderRadius:99, fontWeight:600 }}>
            {items.length}
            </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {items.map(r => <RecCard key={recKey(r)} rec={r}/>)}
        </div>
        </section>
    )
}

// ── Main page ─────────────────────────────────────────────────
export default function RecommendationsPage() {
    const { data, loading, error, refetch } = useRecommendations()

  // Normalise + deduplicate + apply smart priority
    const recs = useMemo(() => {
    const raw = Array.isArray(data) ? data : (data?.recommendations || [])

    // Deduplicate by composite key (task_type + type)
    const seen = new Set()
    const unique = raw.filter(r => {
        const k = recKey(r)
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })

    // Flag suggested items
    const flagged = unique.map(r => ({ ...r, _suggested: isSuggested(r) }))

    // Suggested items first, then the rest
    return [
        ...flagged.filter(r =>  r._suggested),
        ...flagged.filter(r => !r._suggested),
    ]
}, [data])

const trending = recs.filter(r => !r.type || r.type === 'similar_users')
const focus    = recs.filter(r => r.type === 'cluster')
const attn     = recs.filter(r => r.type === 'outlier')
const isCategorised = focus.length > 0 || attn.length > 0

return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }} className="anim-fade-in">

      {/* Header */}
    <div className="page-header">
        <div>
        <h2 className="page-title">Recommendations</h2>
        <p className="page-subtitle">
            Personalised suggestions powered by Collaborative Filtering · updated each session
        </p>
        </div>
        <button onClick={refetch}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6a5e4e', background:'#fff', border:'1.5px solid #e2dbd0', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.14s' }}
            onMouseEnter={e => { e.currentTarget.style.background='#f5f0e8'; e.currentTarget.style.borderColor='#c8c0b2' }}
            onMouseLeave={e => { e.currentTarget.style.background='#fff';    e.currentTarget.style.borderColor='#e2dbd0' }}
            aria-label="Refresh recommendations"
        >
            <RefreshCw size={12} aria-hidden="true"/> Refresh
            </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {[0,1,2].map(i => <RecSkeleton key={i}/>)}
            </div>
        )}

        {/* Error */}
        {!loading && error && <ErrorBlock message={error} onRetry={refetch}/>}

        {/* Empty state */}
        {!loading && !error && recs.length === 0 && (
            <div className="white-card" style={{ padding:'52px 24px', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#f0ece5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }} aria-hidden="true">
                <Zap size={22} style={{ color:'#c0b8ae' }}/>
            </div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:'0 0 6px' }}>
                No recommendations yet
            </p>
            <p style={{ fontSize:12, color:'#b0a898', maxWidth:300, margin:'0 auto 18px' }}>
                Complete a few tasks first — the recommendation engine learns from your patterns.
            </p>
            <Link to="/app/tasks"
                style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#1a1f35', color:'#fff', padding:'9px 16px', borderRadius:9, fontSize:12, fontWeight:600, fontFamily:'var(--font-display)', textDecoration:'none', letterSpacing:'-0.01em' }}>
                Go to Tasks
            </Link>
            </div>
        )}

        {/* Recommendation cards */}
        {!loading && !error && recs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {isCategorised ? (
                <>
                <CatSection catKey="similar_users" items={trending}/>
                <CatSection catKey="cluster"       items={focus}/>
                <CatSection catKey="outlier"       items={attn}/>
                </>
            ) : (
                // All same type — flat grid, no section headers needed
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                {recs.map(r => <RecCard key={recKey(r)} rec={r}/>)}
                </div>
            )}
            </div>
        )}

        <DashboardFooter/>
        </div>
    )
}
