// Shared by StudentDashboard.jsx and AssignmentManagement.jsx — lets a
// student submit, edit, or resubmit a task from either page.
//
// `onSubmitted` must have the same signature as useTasks()'s
// submitAssignment(taskId, formData): it performs the API call itself and
// returns the updated task.
import { useState } from 'react'
import { X, Upload, FileText, Paperclip, Send, Download, MessageSquare } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import { getTaskTitle, apiError } from '../../utils/helpers.js'

export default function SubmitAssignmentModal({ task, onClose, onSubmitted }) {
    const isEdit = task.status === 'submitted'
    const isResubmit = task.status === 'rejected'
    const [file,    setFile]    = useState(null)
    const [text,    setText]    = useState(isEdit ? (task.submission_text || '') : '')
    const [saving,  setSaving]  = useState(false)
    const [error,   setError]   = useState('')
    const toast = useToast()

    const modalTitle  = isEdit ? 'Edit Submission' : isResubmit ? 'Resubmit Assignment' : 'Submit Assignment'
    const actionLabel = isEdit ? 'Save Changes' : isResubmit ? 'Resubmit' : 'Submit'

    async function handleSubmit() {
        if (!file && !text.trim()) {
            setError('Please upload a file or write a response.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const fd = new FormData()
            if (file) fd.append('submission_file', file)
            if (text.trim()) fd.append('submission_text', text.trim())
            await onSubmitted(task.id, fd)
            toast.success(isEdit ? 'Submission updated successfully' : 'Assignment submitted successfully')
            onClose()
        } catch (err) {
            setError(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}
            className="anim-fade-in">
            <div style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}
                className="anim-scale-in">

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>
                            {modalTitle}
                        </h3>
                        <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'2px 0 0' }}>{getTaskTitle(task)}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {task.teacher_feedback && (
                        <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'#f4f0fc', borderLeft:'3px solid #6d4fc2', borderRadius:8 }}>
                            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background:'#e5daf8', flexShrink:0, marginTop:1 }}>
                                <MessageSquare size={11} style={{ color:'#6d4fc2' }}/>
                            </span>
                            <div style={{ minWidth:0 }}>
                                <p style={{ fontSize:9.5, fontWeight:700, color:'#6d4fc2', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                                    Teacher Feedback
                                </p>
                                <p style={{ fontSize:11.5, color:'var(--color-text-secondary)', margin:0, lineHeight:1.4 }}>{task.teacher_feedback}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'var(--color-red-light)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    {task.assignment?.file && (
                        <a href={task.assignment.file} target="_blank" rel="noreferrer" download
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#6d4fc2', background:'#f0e8ff', padding:'8px 10px', borderRadius:8, textDecoration:'none' }}>
                            <Download size={12}/> Download assignment document: {task.assignment.file_name || 'file'}
                        </a>
                    )}

                    {isEdit && task.submission_file && !file && (
                        <a href={task.submission_file} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                            <Paperclip size={12}/> Current file: {task.file_name || 'view attachment'}
                        </a>
                    )}

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            {isEdit ? 'Replace File (optional)' : 'Upload Solution (PDF, DOCX, DOC, Images)'}
                        </label>
                        <div style={{ border:'2px dashed var(--color-border)', borderRadius:10, padding:'14px', textAlign:'center', background:'var(--color-surface-subtle)', cursor:'pointer' }}
                            onClick={() => document.getElementById('sam-sub-file').click()}>
                            <input id="sam-sub-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0]||null)} style={{ display:'none' }}/>
                            {file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                    <FileText size={15} style={{ color:'var(--color-primary)' }}/>
                                    <span style={{ fontSize:13, color:'var(--color-text)', fontWeight:600 }}>{file.name}</span>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-red)', padding:2 }}><X size={11}/></button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={18} style={{ color:'var(--color-text-placeholder)', margin:'0 auto 5px', display:'block' }}/>
                                    <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>Click to upload your solution</p>
                                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:'2px 0 0' }}>PDF, DOCX, DOC, JPG, PNG</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            Written Response (optional)
                        </label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Add any notes or written response for your teacher…"
                            rows={4}
                            style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', resize:'vertical', boxSizing:'border-box' }}
                        />
                    </div>

                    <p style={{ fontSize:11, color:'var(--color-text-placeholder)', margin:0 }}>
                        At least one of file or written response is required.
                    </p>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 20px', borderTop:'1px solid var(--color-border)' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                        {saving ? 'Saving…' : <><Send size={13}/> {actionLabel}</>}
                    </button>
                </div>
            </div>
        </div>
    )
}