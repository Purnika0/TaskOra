    import React, { useState, useEffect, useCallback, useMemo } from 'react'
    import {
    Users, RefreshCw, ShieldCheck, Trash2, Search,
    GraduationCap, BookOpen, ChevronUp, ChevronDown,
    AlertCircle, CheckCircle2, Clock, PlusCircle, X,
    Bell, UserCheck, UserX, LayoutDashboard, Activity,
    TrendingUp, Settings2, BarChart2, Globe, Shield,
    Database, Cpu, Eye, EyeOff, Minus,
    ArrowUpRight, ArrowDownRight, Circle,
    } from 'lucide-react'
    import authService     from '../../services/auth.service.js'
    import { useToast }    from '../../context/ToastContext.jsx'
    import { useConfirm }  from '../../context/ConfirmContext.jsx'
    import { useAuth }     from '../../hooks/useAuth.js'
    import { LoadingBlock }from '../../components/shared/Loader.jsx'
    import { apiError }    from '../../utils/helpers.js'
    import {
    BS_MONTH_NAMES as _BSM, buildMonthDays as _build, adToBS as _a2bs,
    } from '../../utils/bsCalendar.js'

        /* ── Admin Design Tokens (dark theme, isolated) ───────────────── */
        const ADM = {
        bg:        '#0f1117',
        surface:   '#171923',
        elevated:  '#1e2435',
        border:    '#252d3d',
        borderSub: '#1a2030',
        text:      '#e2e8f0',
        textSub:   '#718096',
        textMuted: '#4a5568',
        accent:    '#3b82f6',
        accentBg:  'rgba(59,130,246,0.10)',
        green:     '#10b981',
        greenBg:   'rgba(16,185,129,0.10)',
        amber:     '#f59e0b',
        amberBg:   'rgba(245,158,11,0.10)',
        red:       '#ef4444',
        redBg:     'rgba(239,68,68,0.10)',
        purple:    '#8b5cf6',
        purpleBg:  'rgba(139,92,246,0.10)',
        }

        /* ── Role config ──────────────────────────────────────────────── */
        const ROLE = {
        admin:   { bg:'rgba(239,68,68,0.12)',  text:'#fc8181', dot:'#ef4444', label:'Admin'   },
        teacher: { bg:'rgba(139,92,246,0.12)', text:'#c4b5fd', dot:'#8b5cf6', label:'Teacher' },
        student: { bg:'rgba(59,130,246,0.12)', text:'#93c5fd', dot:'#3b82f6', label:'Student' },
        }

        /* ── Shared style objects ─────────────────────────────────────── */
        const S = {
        card: {
            background: ADM.surface,
            border: `1px solid ${ADM.border}`,
            borderRadius: 12,
            padding: '20px 22px',
        },
        cardFlat: {
            background: ADM.surface,
            border: `1px solid ${ADM.border}`,
            borderRadius: 12,
            overflow: 'hidden',
        },
        label: {
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            color: ADM.textSub,
            fontFamily: 'var(--font-body)',
            margin: 0,
        },
        heading: {
            fontSize: 13,
            fontWeight: 600,
            color: ADM.text,
            fontFamily: 'var(--font-display)',
            margin: 0,
            letterSpacing: '-0.01em',
        },
        subtext: {
            fontSize: 11,
            color: ADM.textSub,
            fontFamily: 'var(--font-body)',
            margin: 0,
            lineHeight: 1.5,
        },
        input: {
            background: ADM.elevated,
            border: `1px solid ${ADM.border}`,
            borderRadius: 8,
            padding: '8px 11px',
            fontSize: 12,
            color: ADM.text,
            outline: 'none',
            fontFamily: 'var(--font-body)',
        },
        btn: {
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.01em',
            transition: 'all 0.15s',
        },
        }

        /* ── Metric Card ──────────────────────────────────────────────── */
        function MetricCard({ label, value, sub, icon: Icon, color, loading }) {
        return (
            <div style={{ ...S.card, display:'flex', flexDirection:'column', gap:12, borderTop:`2px solid ${color}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={S.label}>{label}</span>
                <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={14} style={{ color }}/>
                </div>
            </div>
            {loading
                ? <div style={{ height:32, background:ADM.elevated, borderRadius:6 }}/>
                : <div>
                    <p style={{ fontSize:30, fontWeight:800, color:ADM.text, lineHeight:1, fontFamily:'var(--font-display)', letterSpacing:'-0.04em', margin:0 }}>{value ?? 0}</p>
                    {sub && <p style={{ ...S.subtext, marginTop:5 }}>{sub}</p>}
                </div>
            }
            </div>
        )
        }

        /* ── Role Pill ────────────────────────────────────────────────── */
        function RolePill({ role }) {
        const r = ROLE[role] || ROLE.student
        return (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:r.bg, color:r.text, textTransform:'capitalize' }}>
            <span style={{ width:4, height:4, borderRadius:'50%', background:r.dot }}/>
            {r.label}
            </span>
        )
        }

        /* ── Sortable Table Header ────────────────────────────────────── */
        function SortTh({ field, label, sortKey, sortDir, onSort }) {
        const active = sortKey === field
        return (
            <th onClick={() => onSort(field)} style={{ cursor:'pointer', userSelect:'none' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, color: active ? ADM.accent : ADM.textSub }}>
                {label}
                {active
                ? (sortDir==='asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)
                : <Minus size={8} style={{ opacity:0.35 }}/>}
            </span>
            </th>
        )
        }

        /* ── Mini Bar ─────────────────────────────────────────────────── */
        function MiniBar({ value, max, color }) {
        const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2
        return (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:5, background:ADM.elevated, borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.6s ease' }}/>
            </div>
            <span style={{ fontSize:10, color:ADM.textSub, minWidth:28, textAlign:'right' }}>{Math.round((value/(max||1))*100)}%</span>
            </div>
        )
        }

        /* ═══════════════════════════════════════════════════════════════
        OVERVIEW TAB
        ═══════════════════════════════════════════════════════════════ */
        function OverviewTab({ users, loading, onRefresh }) {
        const counts = {
            total:     users.length,
            students:  users.filter(u => u.role==='student').length,
            teachers:  users.filter(u => u.role==='teacher').length,
            admins:    users.filter(u => u.role==='admin').length,
            active:    users.filter(u => u.is_active!==false).length,
            suspended: users.filter(u => u.is_active===false).length,
        }

        const recent = [...users]
            .sort((a,b) => (b.date_joined||'').localeCompare(a.date_joined||''))
            .slice(0, 8)

        const roleRows = [
            { label:'Students',  val:counts.students,  color:ADM.accent  },
            { label:'Teachers',  val:counts.teachers,  color:ADM.purple  },
            { label:'Admins',    val:counts.admins,    color:ADM.red     },
            { label:'Active',    val:counts.active,    color:ADM.green   },
            { label:'Suspended', val:counts.suspended, color:ADM.amber   },
        ]

        return (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
                <MetricCard label="Total Users"    value={counts.total}    icon={Users}         color={ADM.accent}  sub="All registered"  loading={loading}/>
                <MetricCard label="Students"       value={counts.students} icon={BookOpen}      color={ADM.accent}  sub="Enrolled"        loading={loading}/>
                <MetricCard label="Teachers"       value={counts.teachers} icon={GraduationCap} color={ADM.purple}  sub="Faculty"         loading={loading}/>
                <MetricCard label="Administrators" value={counts.admins}   icon={ShieldCheck}   color={ADM.red}     sub="System admins"   loading={loading}/>
            </div>

            {/* Distribution + Recent registrations */}
            <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:14, flexWrap:'wrap' }}>

                {/* Distribution */}
                <div style={S.card}>
                <p style={{ ...S.label, marginBottom:18 }}>User Distribution</p>
                <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                    {roleRows.map(row => (
                    <div key={row.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:11, color:ADM.textSub }}>{row.label}</span>
                        <span style={{ fontSize:11, fontWeight:600, color:ADM.text }}>{row.val}</span>
                        </div>
                        <MiniBar value={row.val} max={counts.total||1} color={row.color}/>
                    </div>
                    ))}
                </div>
                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${ADM.border}` }}>
                    <p style={{ ...S.label, marginBottom:10 }}>Platform Health</p>
                    {[
                    { dot:ADM.green, label:'Active accounts', val:counts.active    },
                    { dot:ADM.amber, label:'Suspended',       val:counts.suspended },
                    ].map(i => (
                    <div key={i.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Circle size={6} fill={i.dot} style={{ color:i.dot }}/>
                        <span style={{ fontSize:11, color:ADM.textSub }}>{i.label}</span>
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, color:ADM.text }}>{i.val}</span>
                    </div>
                    ))}
                </div>
                </div>

                {/* Recent registrations */}
                <div style={S.cardFlat}>
                <div style={{ padding:'16px 20px', borderBottom:`1px solid ${ADM.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Clock size={13} style={{ color:ADM.textSub }}/>
                    <p style={S.heading}>Recent Registrations</p>
                    </div>
                    <button onClick={onRefresh} style={{ ...S.btn, background:'none', color:ADM.textSub, padding:'4px 8px', fontSize:11 }}
                    onMouseEnter={e=>e.currentTarget.style.color=ADM.text}
                    onMouseLeave={e=>e.currentTarget.style.color=ADM.textSub}>
                    <RefreshCw size={10}/> Refresh
                    </button>
                </div>
                {loading ? (
                    <div style={{ padding:24 }}><LoadingBlock/></div>
                ) : recent.length===0 ? (
                    <div style={{ padding:'44px 16px', textAlign:'center' }}>
                    <Users size={22} style={{ color:ADM.border, margin:'0 auto 8px' }}/>
                    <p style={{ ...S.subtext, textAlign:'center' }}>No users yet.</p>
                    </div>
                ) : recent.map((u,i) => {
                    const r    = ROLE[u.role]||ROLE.student
                    const init = (u.full_name||u.username||'?').charAt(0).toUpperCase()
                    return (
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom: i<recent.length-1 ? `1px solid ${ADM.borderSub}` : 'none' }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:r.bg, color:r.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--font-display)' }}>
                        {init}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:ADM.text, margin:0, lineHeight:1.3 }}>{u.full_name||u.username}</p>
                        <p style={{ fontSize:10, color:ADM.textMuted, margin:0 }}>@{u.username}</p>
                        </div>
                        <RolePill role={u.role}/>
                        <span style={{ fontSize:10, color:ADM.textMuted, flexShrink:0 }}>
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                        </span>
                    </div>
                    )
                })}
                </div>
            </div>

            {/* System status */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
                {[
                { icon:Database, label:'Database',  status:'Operational', color:ADM.green  },
                { icon:Cpu,      label:'ML Engine', status:'Running',     color:ADM.green  },
                { icon:Globe,    label:'API Server',status:'Healthy',     color:ADM.green  },
                { icon:Shield,   label:'Auth Layer',status:'Secured',     color:ADM.green  },
                ].map(item => (
                <div key={item.label} style={{ ...S.card, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:ADM.elevated, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <item.icon size={15} style={{ color:ADM.textSub }}/>
                    </div>
                    <div>
                    <p style={{ fontSize:12, fontWeight:600, color:ADM.text, margin:0 }}>{item.label}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                        <Circle size={6} fill={item.color} style={{ color:item.color }}/>
                        <span style={{ fontSize:10, color:item.color }}>{item.status}</span>
                    </div>
                    </div>
                </div>
                ))}
            </div>
            </div>
        )
        }

        /* ═══════════════════════════════════════════════════════════════
        USERS TAB
        ═══════════════════════════════════════════════════════════════ */
        function UsersTab({ users, loading, currentUser, onRefresh, onPromote, onDelete, onSuspend }) {
        const [search,       setSearch]       = useState('')
        const [roleFilter,   setRoleFilter]   = useState('')
        const [statusFilter, setStatusFilter] = useState('')
        const [sortKey,      setSortKey]      = useState('joined')
        const [sortDir,      setSortDir]      = useState('desc')
        const [page,         setPage]         = useState(1)
        const PER_PAGE = 12

        function handleSort(field) {
            if (sortKey===field) setSortDir(d=>d==='asc'?'desc':'asc')
            else { setSortKey(field); setSortDir('asc') }
        }

        const filtered = users
            .filter(u => {
            if (roleFilter && u.role!==roleFilter) return false
            if (statusFilter==='active'    && u.is_active===false) return false
            if (statusFilter==='suspended' && u.is_active!==false) return false
            if (search) {
                const q = search.toLowerCase()
                return [u.username,u.full_name||'',u.email||''].some(v=>v.toLowerCase().includes(q))
            }
            return true
            })
            .sort((a,b) => {
            let va, vb
            if      (sortKey==='name')   { va=(a.full_name||a.username).toLowerCase(); vb=(b.full_name||b.username).toLowerCase() }
            else if (sortKey==='role')   { va=a.role; vb=b.role }
            else                         { va=a.date_joined||''; vb=b.date_joined||'' }
            const c = va<vb?-1:va>vb?1:0
            return sortDir==='asc'?c:-c
            })

        const totalPages = Math.max(1, Math.ceil(filtered.length/PER_PAGE))
        const pageUsers  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
        const selStyle   = { ...S.input, cursor:'pointer', padding:'7px 10px' }

        return (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <style>{`
                .adm-table { min-width:580px; border-collapse:collapse; width:100%; }
                .adm-table th { background:${ADM.elevated}; color:${ADM.textSub}; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; padding:10px 14px; text-align:left; border-bottom:1px solid ${ADM.border}; white-space:nowrap; }
                .adm-table td { padding:11px 14px; font-size:12px; color:${ADM.text}; border-bottom:1px solid ${ADM.borderSub}; vertical-align:middle; white-space:nowrap; }
                .adm-table tbody tr:hover td { background:${ADM.elevated}; }
                .adm-table tbody tr:last-child td { border-bottom:none; }
                .adm-act { width:28px; height:28px; border-radius:7px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.12s; }
                @media(max-width:700px){ .adm-sm { display:none !important; } }
                @media(max-width:900px){ .adm-md { display:none !important; } }
            `}</style>

            {/* Mini stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {[
                { label:'Total',     val:users.length,                                color:ADM.accent  },
                { label:'Students',  val:users.filter(u=>u.role==='student').length,  color:ADM.accent  },
                { label:'Teachers',  val:users.filter(u=>u.role==='teacher').length,  color:ADM.purple  },
                { label:'Suspended', val:users.filter(u=>u.is_active===false).length, color:ADM.amber   },
                ].map(s => (
                <div key={s.label} style={{ ...S.card, padding:'14px 16px', borderTop:`2px solid ${s.color}` }}>
                    <p style={S.label}>{s.label}</p>
                    <p style={{ fontSize:24, fontWeight:800, color:ADM.text, fontFamily:'var(--font-display)', letterSpacing:'-0.03em', margin:'6px 0 0' }}>
                    {loading ? '—' : s.val}
                    </p>
                </div>
                ))}
            </div>

            {/* Toolbar */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:ADM.textMuted, pointerEvents:'none' }}/>
                <input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
                    placeholder="Search users…"
                    style={{ ...S.input, paddingLeft:30, width:'100%', boxSizing:'border-box' }}
                    aria-label="Search users"/>
                </div>
                <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1)}} style={selStyle} aria-label="Filter by role">
                <option value="">All roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                </select>
                <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} style={selStyle} aria-label="Filter by status">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                </select>
                <button onClick={onRefresh} style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub, border:`1px solid ${ADM.border}` }}
                onMouseEnter={e=>e.currentTarget.style.color=ADM.text}
                onMouseLeave={e=>e.currentTarget.style.color=ADM.textSub}>
                <RefreshCw size={11}/> Refresh
                </button>
                <span style={{ ...S.subtext, marginLeft:'auto' }}>{filtered.length} user{filtered.length!==1?'s':''}</span>
            </div>

            {/* Table */}
            <div style={S.cardFlat}>
                {loading ? (
                <div style={{ padding:36 }}><LoadingBlock/></div>
                ) : filtered.length===0 ? (
                <div style={{ padding:'48px 16px', textAlign:'center' }}>
                    <AlertCircle size={24} style={{ color:ADM.border, margin:'0 auto 10px' }}/>
                    <p style={{ ...S.subtext, textAlign:'center' }}>No users match your filters.</p>
                </div>
                ) : (
                <div style={{ overflowX:'auto' }}>
                    <table className="adm-table">
                    <thead>
                        <tr>
                        <th style={{ width:36 }}>#</th>
                        <SortTh field="name"   label="User"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                        <th className="adm-sm">Username</th>
                        <th className="adm-md">Email</th>
                        <SortTh field="role"   label="Role"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                        <SortTh field="joined" label="Joined" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                        <th>Change Role</th>
                        <th style={{ width:80 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageUsers.map((u,i) => {
                        const r    = ROLE[u.role]||ROLE.student
                        const init = (u.full_name||u.username||'?').charAt(0).toUpperCase()
                        const self = u.id===currentUser?.id
                        return (
                            <tr key={u.id} style={{ opacity: u.is_active===false ? 0.5 : 1 }}>
                            <td style={{ color:ADM.textMuted, fontSize:10, fontWeight:600 }}>{(page-1)*PER_PAGE+i+1}</td>
                            <td>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:r.bg, color:r.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--font-display)' }}>
                                    {init}
                                </div>
                                <div>
                                    <p style={{ fontSize:13, fontWeight:600, color:ADM.text, margin:0, display:'flex', alignItems:'center', gap:5 }}>
                                    {u.full_name||'—'}
                                    {u.is_active===false && (
                                        <span style={{ fontSize:9, fontWeight:700, background:ADM.amberBg, color:ADM.amber, padding:'1px 5px', borderRadius:99, textTransform:'uppercase' }}>Suspended</span>
                                    )}
                                    </p>
                                    <p style={{ fontSize:10, color:ADM.textMuted, margin:0 }}>
                                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}) : '—'}
                                    </p>
                                </div>
                                </div>
                            </td>
                            <td className="adm-sm" style={{ color:ADM.textSub }}>@{u.username}</td>
                            <td className="adm-md" style={{ color:ADM.textSub }}>{u.email||'—'}</td>
                            <td><RolePill role={u.role}/></td>
                            <td style={{ color:ADM.textMuted, fontSize:11 }}>{u.date_joined?.split('T')[0]||'—'}</td>
                            <td>
                                {!self && u.role!=='admin' && (
                                <select defaultValue="" key={u.id+u.role}
                                    onChange={e=>{if(e.target.value){onPromote(u,e.target.value);e.target.value=''}}}
                                    style={{ ...S.input, padding:'4px 8px', fontSize:11, cursor:'pointer' }}
                                    aria-label={`Change role for ${u.username}`}>
                                    <option value="" disabled>Role…</option>
                                    {u.role!=='student' && <option value="student">Student</option>}
                                    {u.role!=='teacher' && <option value="teacher">Teacher</option>}
                                    {u.role!=='admin'   && <option value="admin">Admin</option>}
                                </select>
                                )}
                            </td>
                            <td>
                                {!self && (
                                <div style={{ display:'flex', gap:4 }}>
                                    <button className="adm-act" onClick={()=>onSuspend(u)}
                                    title={u.is_active===false?'Unsuspend':'Suspend'}
                                    style={{ color:ADM.amber }}
                                    onMouseEnter={e=>e.currentTarget.style.background=ADM.amberBg}
                                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                                    {u.is_active===false ? <UserCheck size={13}/> : <UserX size={13}/>}
                                    </button>
                                    <button className="adm-act" onClick={()=>onDelete(u)}
                                    title="Delete user"
                                    style={{ color:ADM.red }}
                                    onMouseEnter={e=>e.currentTarget.style.background=ADM.redBg}
                                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                                    <Trash2 size={13}/>
                                    </button>
                                </div>
                                )}
                            </td>
                            </tr>
                        )
                        })}
                    </tbody>
                    </table>
                </div>
                )}

                {/* Pagination */}
                {!loading && filtered.length>PER_PAGE && (
                <div style={{ padding:'10px 16px', borderTop:`1px solid ${ADM.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                    <p style={S.subtext}>Page {page} of {totalPages} · {filtered.length} users</p>
                    <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                        style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub, padding:'5px 10px', opacity:page===1?0.4:1 }}>←</button>
                    {Array.from({length:totalPages},(_,i)=>i+1)
                        .filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1)
                        .reduce((acc,n,idx,arr)=>{ if(idx>0&&n-arr[idx-1]>1) acc.push('…'); acc.push(n); return acc },[])
                        .map((item,idx) =>
                        typeof item==='string'
                            ? <span key={`e${idx}`} style={{ padding:'5px 4px', fontSize:10, color:ADM.textMuted }}>…</span>
                            : <button key={item} onClick={()=>setPage(item)}
                                style={{ ...S.btn, padding:'5px 9px', background:page===item?ADM.accent:ADM.elevated, color:page===item?'#fff':ADM.textSub, fontSize:12 }}>
                                {item}
                            </button>
                        )}
                    <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                        style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub, padding:'5px 10px', opacity:page===totalPages?0.4:1 }}>→</button>
                    </div>
                </div>
                )}
            </div>
            </div>
        )
        }

        /* ═══════════════════════════════════════════════════════════════
        ANALYTICS TAB
        ═══════════════════════════════════════════════════════════════ */
        function AnalyticsTab({ users }) {
        const total = users.length || 1

        const roleData = [
            { label:'Students', val:users.filter(u=>u.role==='student').length, color:ADM.accent  },
            { label:'Teachers', val:users.filter(u=>u.role==='teacher').length, color:ADM.purple  },
            { label:'Admins',   val:users.filter(u=>u.role==='admin').length,   color:ADM.red     },
        ].map(r => ({ ...r, pct:Math.round((r.val/total)*100) }))

        const monthlyJoins = useMemo(() => {
            const buckets = {}
            const now = new Date()
            for (let i=5; i>=0; i--) {
            const d   = new Date(now.getFullYear(), now.getMonth()-i, 1)
            const key = d.toLocaleDateString('en-US',{month:'short',year:'2-digit'})
            buckets[key] = 0
            }
            users.forEach(u => {
            if (!u.date_joined) return
            const key = new Date(u.date_joined).toLocaleDateString('en-US',{month:'short',year:'2-digit'})
            if (key in buckets) buckets[key]++
            })
            return Object.entries(buckets).map(([label,val]) => ({label,val}))
        }, [users])

        const maxJoin = Math.max(...monthlyJoins.map(m=>m.val), 1)

        return (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14 }}>
                {[
                { label:'Registered',    val:users.length,                                icon:Users,        color:ADM.accent  },
                { label:'Active',        val:users.filter(u=>u.is_active!==false).length, icon:Activity,     color:ADM.green   },
                { label:'Faculty',       val:users.filter(u=>u.role==='teacher').length,  icon:GraduationCap,color:ADM.purple  },
                { label:'Suspended',     val:users.filter(u=>u.is_active===false).length, icon:AlertCircle,  color:ADM.amber   },
                ].map(k => (
                <div key={k.label} style={{ ...S.card, borderTop:`2px solid ${k.color}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <p style={S.label}>{k.label}</p>
                    <k.icon size={14} style={{ color:k.color }}/>
                    </div>
                    <p style={{ fontSize:26, fontWeight:800, color:ADM.text, fontFamily:'var(--font-display)', letterSpacing:'-0.04em', margin:0 }}>{k.val}</p>
                </div>
                ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {/* Monthly bar chart */}
                <div style={S.card}>
                <p style={{ ...S.label, marginBottom:20 }}>Monthly Registrations (Last 6 Months)</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:100 }}>
                    {monthlyJoins.map(m => {
                    const h = maxJoin>0 ? Math.max(4, Math.round((m.val/maxJoin)*90)) : 4
                    return (
                        <div key={m.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:10, color:ADM.textSub, fontWeight:600, minHeight:14 }}>{m.val||''}</span>
                        <div style={{ width:'100%', height:`${h}%`, minHeight:4, background:ADM.accent, borderRadius:'4px 4px 2px 2px', opacity:0.75, transition:'height 0.4s ease' }}/>
                        <span style={{ fontSize:9, color:ADM.textMuted, textAlign:'center', lineHeight:1.2 }}>{m.label}</span>
                        </div>
                    )
                    })}
                </div>
                </div>

                {/* Role distribution */}
                <div style={S.card}>
                <p style={{ ...S.label, marginBottom:20 }}>Role Distribution</p>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {roleData.map(r => (
                    <div key={r.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Circle size={6} fill={r.color} style={{ color:r.color }}/>
                            <span style={{ fontSize:12, color:ADM.text }}>{r.label}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, color:ADM.text }}>
                            {r.val} <span style={{ color:ADM.textMuted, fontWeight:400 }}>({r.pct}%)</span>
                        </span>
                        </div>
                        <div style={{ height:6, background:ADM.elevated, borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${r.pct}%`, height:'100%', background:r.color, borderRadius:99, transition:'width 0.6s ease' }}/>
                        </div>
                    </div>
                    ))}
                </div>
                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${ADM.border}` }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                        { label:'Active Rate',  val:`${Math.round((users.filter(u=>u.is_active!==false).length/(users.length||1))*100)}%`, color:ADM.green },
                        { label:'Suspend Rate', val:`${Math.round((users.filter(u=>u.is_active===false).length/(users.length||1))*100)}%`, color:ADM.amber },
                    ].map(m => (
                        <div key={m.label} style={{ background:ADM.elevated, borderRadius:8, padding:'10px 12px' }}>
                        <p style={S.label}>{m.label}</p>
                        <p style={{ fontSize:20, fontWeight:700, color:m.color, fontFamily:'var(--font-display)', margin:'6px 0 0' }}>{m.val}</p>
                        </div>
                    ))}
                    </div>
                </div>
                </div>
            </div>

            {/* ML system info banner */}
            <div style={{ ...S.card, borderLeft:`3px solid ${ADM.purple}`, display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:9, background:ADM.purpleBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Cpu size={16} style={{ color:ADM.purple }}/>
                </div>
                <div>
                <p style={{ ...S.heading, marginBottom:5 }}>ML Recommendation Engine</p>
                <p style={{ ...S.subtext, lineHeight:1.7 }}>
                    TaskOra runs three backend ML algorithms:{' '}
                    <strong style={{ color:ADM.text }}>Collaborative Filtering</strong> (cosine similarity for task recommendations),{' '}
                    <strong style={{ color:ADM.text }}>K-Means Clustering</strong> (student performance grouping), and{' '}
                    <strong style={{ color:ADM.text }}>Isolation Forest</strong> (anomaly/outlier detection).
                    All computation is server-side — the frontend only visualises results.
                </p>
                </div>
            </div>
            </div>
        )
        }


    /* ═══════════════════════════════════════════════════════════════
    ACTIVITY MONITORING TAB  (replaces Platform/Settings tab)
    Shows real activity feed, user counts, assignment monitoring.
    NO delete-system option anywhere.
    ═══════════════════════════════════════════════════════════════ */
    function ActivityTab({ users }) {
    const activities = useMemo(() => {
        const items = []
        const recent = [...users]
        .sort((a,b) => (b.date_joined||'').localeCompare(a.date_joined||''))
        .slice(0, 15)
        recent.forEach(u => {
        if (u.date_joined) {
            items.push({
            id: `join-${u.id}`,
            label: `${u.full_name || u.username} joined as ${u.role}`,
            time: u.date_joined,
            color: u.role === 'teacher' ? ADM.purple : ADM.accent,
            })
        }
        if (u.is_active === false) {
            items.push({
            id: `suspend-${u.id}`,
            label: `${u.full_name || u.username} account suspended`,
            time: u.date_joined,
            color: ADM.amber,
            })
        }
        })
        return items.slice(0, 20)
    }, [users])

    const counts = {
        total:     users.length,
        students:  users.filter(u => u.role === 'student').length,
        teachers:  users.filter(u => u.role === 'teacher').length,
        suspended: users.filter(u => u.is_active === false).length,
        active:    users.filter(u => u.is_active !== false).length,
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            {[
            { label:'Total Users',    val:counts.total,    color:ADM.accent  },
            { label:'Students',       val:counts.students, color:ADM.accent  },
            { label:'Teachers',       val:counts.teachers, color:ADM.purple  },
            { label:'Active',         val:counts.active,   color:ADM.green   },
            { label:'Suspended',      val:counts.suspended,color:ADM.amber   },
            ].map(s => (
            <div key={s.label} style={{ ...S.card, borderTop:`2px solid ${s.color}` }}>
                <p style={S.label}>{s.label}</p>
                <p style={{ fontSize:28, fontWeight:800, color:s.color,
                fontFamily:'var(--font-display)', letterSpacing:'-0.03em', margin:'6px 0 0', lineHeight:1 }}>
                {s.val}
                </p>
            </div>
            ))}
        </div>

        {/* Activity feed */}
        <div style={S.cardFlat}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${ADM.border}`,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={S.heading}>Recent Activity</p>
            <span style={{ fontSize:10, color:ADM.textMuted }}>{activities.length} events</span>
            </div>
            {activities.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
                <Activity size={24} style={{ color:ADM.border, margin:'0 auto 10px', display:'block' }}/>
                <p style={{ ...S.subtext, textAlign:'center' }}>No activity recorded yet.</p>
            </div>
            ) : (
            <div style={{ padding:'8px 0' }}>
                {activities.map(a => (
                <div key={a.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 18px', borderBottom:`1px solid ${ADM.borderSub}`,
                }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:a.color, flexShrink:0 }}/>
                    <p style={{ ...S.subtext, flex:1, margin:0 }}>{a.label}</p>
                    <span style={{ fontSize:10, color:ADM.textMuted, whiteSpace:'nowrap' }}>
                    {a.time ? new Date(a.time).toLocaleDateString() : '—'}
                    </span>
                </div>
                ))}
            </div>
            )}
        </div>

        {/* Assignment monitoring panel */}
        <div style={S.card}>
            <p style={{ ...S.heading, marginBottom:14 }}>Assignment Monitoring</p>
            <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
            {[
                { label:'Total Students',  val:counts.students, desc:'Enrolled in platform'      },
                { label:'Total Teachers',  val:counts.teachers, desc:'Managing assignments'       },
                { label:'Active Accounts', val:counts.active,   desc:'Able to access platform'   },
            ].map(r => (
                <div key={r.label} style={{ flex:1, minWidth:120 }}>
                <p style={{ fontSize:26, fontWeight:800, color:ADM.text,
                    fontFamily:'var(--font-display)', margin:'0 0 4px', letterSpacing:'-0.03em' }}>
                    {r.val}
                </p>
                <p style={{ fontSize:11, fontWeight:600, color:ADM.textSub, margin:'0 0 2px' }}>{r.label}</p>
                <p style={{ fontSize:10, color:ADM.textMuted, margin:0 }}>{r.desc}</p>
                </div>
            ))}
            </div>
        </div>
        </div>
    )
    }

    /* ═══════════════════════════════════════════════════════════════
    CALENDAR OVERVIEW TAB — admin read-only BS calendar
    Admin can view the schedule. Cannot add/delete tasks.
    ═══════════════════════════════════════════════════════════════ */
    function CalendarOverviewTab() {
    const [cur, setCur] = React.useState(() => {
        const t = _a2bs(new Date())
        return { y: t.year, m: t.month }
    })
    const days     = React.useMemo(() => _build(cur.y, cur.m), [cur.y, cur.m])
    const firstDow = days.length ? days[0].dow : 0
    const bsMonth  = _BSM[cur.m - 1]
    const todayBS  = React.useMemo(() => _a2bs(new Date()), [])
    const DOW      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const RED      = '#ef4444'

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={S.card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
                <p style={S.heading}>BS Calendar Overview</p>
                <p style={{ ...S.subtext, marginTop:4 }}>Bikram Sambat · Nepal holidays · Read-only</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setCur(c => c.m===1?{y:c.y-1,m:12}:{y:c.y,m:c.m-1})}
                style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub, border:`1px solid ${ADM.border}` }}>
                ‹ Prev
                </button>
                <button onClick={() => setCur(c => c.m===12?{y:c.y+1,m:1}:{y:c.y,m:c.m+1})}
                style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub, border:`1px solid ${ADM.border}` }}>
                Next ›
                </button>
            </div>
            </div>

            <div style={{ textAlign:'center', marginBottom:16 }}>
            <p style={{ fontSize:18, fontWeight:700, color:ADM.text,
                fontFamily:'var(--font-display)', margin:'0 0 4px' }}>
                {bsMonth?.en} {cur.y} BS
            </p>
            <p style={{ fontSize:11, color:ADM.textMuted, margin:0 }}>
                {bsMonth?.ne} · {((_BSM[cur.m-1]||{}) && days.length)} days
            </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {DOW.map((d,i) => (
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600,
                color: i===6?'rgba(239,68,68,0.7)':i===0?'rgba(251,146,60,0.7)':ADM.textMuted,
                padding:'4px 0 8px' }}>
                {d}
                </div>
            ))}
            {Array(firstDow).fill(null).map((_,i) => <div key={`b${i}`}/>)}
            {days.map(day => {
                const isToday = day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                return (
                <div key={day.bsKey} title={day.holidayTitle||undefined} style={{
                    aspectRatio:'1', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    borderRadius:6, fontSize:11,
                    fontWeight: day.isHoliday ? 700 : 400,
                    background: isToday ? ADM.accent : day.isHoliday ? 'rgba(239,68,68,0.12)' : ADM.elevated,
                    color: isToday ? '#fff' : day.isHoliday ? RED : day.isSun ? 'rgba(251,146,60,0.8)' : ADM.text,
                    border: isToday ? `1px solid ${ADM.accent}` : `1px solid ${ADM.borderSub}`,
                }}>
                    <span style={{ fontSize:11, lineHeight:1 }}>{day.bsDay}</span>
                    <span style={{ fontSize:8, lineHeight:1, marginTop:1, opacity:0.4 }}>{day.adDate.getDate()}</span>
                </div>
                )
            })}
            </div>

            <div style={{ display:'flex', gap:16, marginTop:16, justifyContent:'center', flexWrap:'wrap' }}>
            {[
                { color:ADM.accent, label:'Today'            },
                { color:RED,        label:'Holiday/Saturday' },
                { color:'rgba(251,146,60,0.8)', label:'Sunday' },
            ].map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:ADM.textSub }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:l.color, flexShrink:0 }}/>
                {l.label}
                </div>
            ))}
            </div>
        </div>
        </div>
    )
    }

    /* ═══════════════════════════════════════════════════════════════
    MAIN EXPORT — AdminDashboard
    TABS: Overview · User Management · Analytics · Activity · Calendar
    Settings tab REMOVED. No delete-system option exists.
    ═══════════════════════════════════════════════════════════════ */
    const TABS = [
    { key:'overview',  label:'Overview',         icon:LayoutDashboard },
    { key:'users',     label:'User Management',  icon:Users           },
    { key:'analytics', label:'Analytics',        icon:BarChart2       },
    { key:'activity',  label:'Activity Monitor', icon:Activity        },
    { key:'calendar',  label:'Calendar',         icon:Globe           },
    ]

    export default function AdminDashboard() {
    const { user }  = useAuth()
    const toast     = useToast()
    const confirm   = useConfirm()
    const [users,   setUsers]   = useState([])
    const [loading, setLoading] = useState(true)
    const [tab,     setTab]     = useState('overview')

    const load = useCallback(async () => {
        setLoading(true)
        try { setUsers(await authService.listUsers()) }
        catch { toast.error('Failed to load users') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    async function handleDelete(u) {
        const ok = await confirm({
        title: `Delete "${u.full_name||u.username}"?`,
        message: 'This permanently removes the user and all their data.',
        danger: true, confirmLabel: 'Delete',
        })
        if (!ok) return
        try { await authService.deleteUser(u.id); toast.success('User deleted'); load() }
        catch (err) { toast.error(apiError(err)) }
    }

    async function handlePromote(u, role) {
        try { await authService.promoteUser(u.id, role); toast.success(`${u.username} → ${role}`); load() }
        catch (err) { toast.error(apiError(err)) }
    }

    async function handleSuspend(u) {
        const nextActive = u.is_active === false
        const action     = nextActive ? 'Unsuspend' : 'Suspend'
        const ok = await confirm({
        title: `${action} "${u.full_name||u.username}"?`,
        message: nextActive ? 'User will regain access.' : 'User will lose access until unsuspended.',
        danger: !nextActive, confirmLabel: action,
        })
        if (!ok) return
        try {
        await authService.updateUser(u.id, { is_active: nextActive })
        toast.success(`${u.username} ${nextActive ? 'unsuspended' : 'suspended'}`)
        load()
        } catch { toast.error('Suspend requires backend is_active field support.') }
    }

    return (
        <>
        <style>{`
            .adm-shell {
            background:${ADM.bg}; min-height:100%; margin:-24px; padding:24px;
            font-family:var(--font-body); color:${ADM.text};
            }
            .adm-tabbar {
            display:flex; gap:2px;
            border-bottom:1px solid ${ADM.border};
            overflow-x:auto; scrollbar-width:none;
            }
            .adm-tabbar::-webkit-scrollbar { display:none; }
            .adm-tabbar button {
            display:flex; align-items:center; gap:7px;
            padding:10px 16px; font-size:12px; font-weight:500;
            border:none; background:none; cursor:pointer;
            font-family:var(--font-body); white-space:nowrap;
            color:${ADM.textSub}; border-bottom:2px solid transparent;
            margin-bottom:-1px; transition:all 0.15s;
            }
            .adm-tabbar button:hover  { color:${ADM.text}; }
            .adm-tabbar button.active { color:${ADM.accent}; border-bottom-color:${ADM.accent}; font-weight:600; }
            @keyframes admfade { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
            .adm-content { animation:admfade 0.18s ease; }
        `}</style>

        <div className="adm-shell anim-fade-in">

            {/* Page header */}
            <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:12,
                    background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ShieldCheck size={20} color="#fff"/>
                </div>
                <div>
                    <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20,
                    color:ADM.text, margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>
                    Administration
                    </h1>
                    <p style={{ fontSize:11, color:ADM.textSub, margin:'3px 0 0' }}>
                    TaskOra Platform Control · {user?.full_name||user?.username}
                    </p>
                </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:9, fontWeight:700, padding:'4px 10px', borderRadius:99,
                    background:ADM.redBg, color:ADM.red, textTransform:'uppercase',
                    letterSpacing:'0.10em', border:`1px solid ${ADM.red}40` }}>
                    System Admin
                </span>
                <button onClick={load}
                    style={{ ...S.btn, background:ADM.elevated, color:ADM.textSub,
                    border:`1px solid ${ADM.border}`, fontSize:11 }}>
                    <RefreshCw size={11}/> Refresh
                </button>
                </div>
            </div>
            </div>

            {/* Tab bar — Settings deliberately excluded */}
            <div className="adm-tabbar" style={{ marginBottom:24 }}>
            {TABS.map(t => {
                const Icon   = t.icon
                const active = tab === t.key
                return (
                <button key={t.key} onClick={() => setTab(t.key)} className={active ? 'active' : ''}>
                    <Icon size={13}/> {t.label}
                </button>
                )
            })}
            </div>

            {/* Tab content */}
            <div className="adm-content" key={tab}>
            {tab === 'overview'  && <OverviewTab  users={users} loading={loading} onRefresh={load}/>}
            {tab === 'users'     && <UsersTab     users={users} loading={loading} currentUser={user}
                                        onRefresh={load} onPromote={handlePromote}
                                        onDelete={handleDelete} onSuspend={handleSuspend}/>}
            {tab === 'analytics' && <AnalyticsTab users={users}/>}
            {tab === 'activity'  && <ActivityTab  users={users}/>}
            {tab === 'calendar'  && <CalendarOverviewTab/>}
            </div>

        </div>
        </>
    )
    }
