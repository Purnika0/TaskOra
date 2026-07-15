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

import { useMemo, useState, useEffect } from 'react'
import { Link }                              from 'react-router-dom'
import { TrendingUp, Layers, AlertCircle, Star, Zap, RefreshCw, BookOpen, ChevronDown } from 'lucide-react'
import { useRecommendations }                from '../../hooks/useAnalytics.js'
import { DashboardFooter }                   from '../../components/layout/Footer.jsx'
import { ErrorBlock }                        from '../../components/shared/Loader.jsx'
import coursesService                        from '../../services/courses.service.js'

// Course titles carry an optional parenthetical (e.g. "Software Project
// Management (BIT402)") — recommendations from the backend already strip
// this, so course names fetched here are normalised the same way to match.
function normaliseCourseTitle(title) {
    return (title || '').split('(')[0].trim()
}
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
    const msLeft = new Date(rec.due_date + 'T23:59:59+05:45') - Date.now()
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

// ── Course filter (select box, fetched from backend) ─────────
// A student can be enrolled in many courses, so a dropdown scales
// better than a row of pills. Options come from the student's actual
// enrolled courses (GET /api/courses/my/), not just whichever ones
// happen to have a recommendation right now.
function CourseFilter({ courses, selected, onSelect }) {
    if (courses.length < 2) return null
    return (
        <label style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:11, color:'#4a4030', fontWeight:600 }}>
        <BookOpen size={12} aria-hidden="true"/> Course:
        <span style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
            <select
            value={selected}
            onChange={e => onSelect(e.target.value)}
            style={{
                appearance:'none', WebkitAppearance:'none', MozAppearance:'none',
                fontSize:12, fontWeight:600, color:'#1a1f35',
                background:'#fff', border:'1.5px solid #e2dbd0', borderRadius:8,
                padding:'6px 28px 6px 11px', cursor:'pointer',
                fontFamily:'var(--font-body)',
            }}
            >
            <option value="all">All courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} style={{ position:'absolute', right:9, pointerEvents:'none', color:'#8a8070' }} aria-hidden="true"/>
        </span>
        </label>
    )
}

// ── Main page ─────────────────────────────────────────────────
export default function RecommendationsPage() {
    const { data, loading, error, refetch } = useRecommendations()
    const [selectedCourse, setSelectedCourse] = useState('all')
    const [enrolledCourses, setEnrolledCourses] = useState([])

  // Fetch the student's actual enrolled courses for the filter dropdown
    useEffect(() => {
        let cancelled = false
        coursesService.getMyCourses()
        .then(list => {
            if (cancelled) return
            const titles = (Array.isArray(list) ? list : list?.results || [])
            .map(c => normaliseCourseTitle(c.title))
            .filter(Boolean)
            setEnrolledCourses([...new Set(titles)].sort())
        })
        .catch(() => { /* filter just won't show if this fails — non-critical */ })
        return () => { cancelled = true }
    }, [])

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

  // Course options for the dropdown: primarily the student's actual
  // enrolled courses (from the backend), with any course names found
  // in the recommendations themselves folded in as a safety net.
    const courses = useMemo(() => {
        const fromRecs = recs.map(r => r.course).filter(Boolean)
        return [...new Set([...enrolledCourses, ...fromRecs])].sort()
    }, [enrolledCourses, recs])

  // Apply the course filter (if one is selected and still valid)
    const visibleRecs = useMemo(() => {
        if (selectedCourse === 'all' || !courses.includes(selectedCourse)) return recs
        return recs.filter(r => r.course === selectedCourse)
    }, [recs, courses, selectedCourse])

const trending = visibleRecs.filter(r => !r.type || r.type === 'similar_users')
const focus    = visibleRecs.filter(r => r.type === 'cluster')
const attn     = visibleRecs.filter(r => r.type === 'outlier')
const isCategorised = focus.length > 0 || attn.length > 0

return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }} className="anim-fade-in">

      {/* Header */}
    <div className="page-header">
        <div>
        <h2 className="page-title">Recommendations</h2>
        <p className="page-subtitle">
            Personalised suggestions powered by Collaborative Filtering
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

        {/* Course filter */}
        {!loading && !error && recs.length > 0 && (
            <CourseFilter courses={courses} selected={selectedCourse} onSelect={setSelectedCourse}/>
        )}

        {/* Loading skeletons */}
        {loading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {[0,1,2].map(i => <RecSkeleton key={i}/>)}
            </div>
        )}

        {/* Error */}
        {!loading && error && <ErrorBlock message={error} onRetry={refetch}/>}

        {/* Empty state — no recommendations at all */}
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

        {/* Empty state — recommendations exist, but none for the selected course */}
        {!loading && !error && recs.length > 0 && visibleRecs.length === 0 && (
            <div className="white-card" style={{ padding:'52px 24px', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#f0ece5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }} aria-hidden="true">
                <BookOpen size={22} style={{ color:'#c0b8ae' }}/>
            </div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:'0 0 6px' }}>
                No recommendations for {selectedCourse}
            </p>
            <p style={{ fontSize:12, color:'#b0a898', maxWidth:300, margin:'0 auto 18px' }}>
                Try another course, or view all courses instead.
            </p>
            <button onClick={() => setSelectedCourse('all')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#1a1f35', color:'#fff', padding:'9px 16px', borderRadius:9, fontSize:12, fontWeight:600, fontFamily:'var(--font-display)', border:'none', cursor:'pointer', letterSpacing:'-0.01em' }}>
                View all courses
            </button>
            </div>
        )}

        {/* Recommendation cards */}
        {!loading && !error && visibleRecs.length > 0 && (
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
                {visibleRecs.map(r => <RecCard key={recKey(r)} rec={r}/>)}
                </div>
            )}
            </div>
        )}

        <DashboardFooter/>
        </div>
    )
}