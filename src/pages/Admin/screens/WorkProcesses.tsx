import { FC, useEffect, useMemo, useState } from "react";
import { getWorkProcesses } from "@/requests/work";
import { WorkProcessStartOut, WorkProcessEndOut } from "@/requests/work/types";
import { createComment, updateComment, deleteComment } from "@/requests/comment";
import { createWorkTask, updateWorkTask, deleteWorkTask } from "@/requests/work-task";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import ImageViewer from "@/components/ui/ImageViewer";
import { useTranslation } from "react-i18next";
import routes from "@/consts/pageRoutes";
import useBackButton from "@/hooks/useBackButton";

type Process = WorkProcessStartOut | WorkProcessEndOut;

const isEnded = (p: Process): p is WorkProcessEndOut => {
  return (p as WorkProcessEndOut).end_time !== undefined;
};

const WorkProcesses: FC = () => {
  const { t } = useTranslation();
  useBackButton(routes.ADMIN);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters] = useState<{
    worker_id?: number | null;
    facility_id?: number | null;
    facility_type_id?: number | null;
  }>({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await getWorkProcesses({
        worker_id: filters.worker_id ?? null,
        facility_id: filters.facility_id ?? null,
        facility_type_id: filters.facility_type_id ?? null,
        limit: 100,
        offset: 0,
      });
      if (error) setError(t('admin.workProcesses.loadError'));
      setProcesses(data || []);
      setIsLoading(false);
    };
    load();
  }, [filters.worker_id, filters.facility_id, filters.facility_type_id, t]);

  const endedProcesses = useMemo(() => processes.filter(isEnded), [processes]);

  // images handled by ImageViewer

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-5">
      <div className="max-w-6xl mx-auto w-full text-lg">
        <div className="flex items-center gap-4 mb-5">
          <h1 className="text-3xl font-semibold text-theme-text-primary">{t('admin.workProcesses.title')}</h1>
        </div>

        {/* <Card className="p-5 mb-5 bg-theme-bg-card border-theme-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="border border-theme-border rounded px-4 py-3 bg-theme-bg-secondary text-theme-text-primary text-base"
              type="number"
              placeholder={t('admin.workProcesses.filters.workerId')}
              value={filters.worker_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, worker_id: e.target.value ? Number(e.target.value) : null }))}
            />
            <input
              className="border border-theme-border rounded px-4 py-3 bg-theme-bg-secondary text-theme-text-primary text-base"
              type="number"
              placeholder={t('admin.workProcesses.filters.facilityId')}
              value={filters.facility_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, facility_id: e.target.value ? Number(e.target.value) : null }))}
            />
            <input
              className="border border-theme-border rounded px-4 py-3 bg-theme-bg-secondary text-theme-text-primary text-base"
              type="number"
              placeholder={t('admin.workProcesses.filters.facilityTypeId')}
              value={filters.facility_type_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, facility_type_id: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
        </Card> */}

        {isLoading && (
          <div className="text-theme-text-muted text-base">{t('common.loading')}</div>
        )}
        {error && (
          <div className="text-red-500 text-base">{error}</div>
        )}

        <div className="space-y-5">
          {endedProcesses.map((p) => (
            <Card key={p.id} className="p-5 bg-theme-bg-card border-theme-border">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-4 text-base">
                  <span className="text-theme-text-muted">#{p.id}</span>
                  <span className="text-theme-text-primary font-semibold">{formatDateTime(p.start_time)}</span>-
                  <span className="text-theme-text-primary font-semibold">{formatDateTime(p.end_time)}</span>
                  <span className={"ml-auto text-sm px-2.5 py-1 rounded " + (p.status_object_finished ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400')}>
                    {p.status_object_finished ? t('admin.workProcesses.badges.finished') : t('admin.workProcesses.badges.notFinished')}
                  </span>
                  <span className="text-sm px-2.5 py-1 rounded bg-theme-bg-tertiary text-theme-text-secondary border border-theme-border">
                    {t('admin.workProcesses.fields.salary')}: {Number((p.summary_rate ?? 0)).toFixed(2)}€
                  </span>
                </div>

                {(p.done_work_photos_url && p.done_work_photos_url.length > 0) || (p.instrument_photos_url && p.instrument_photos_url.length > 0) ? (
                  <div className="mt-3">
                    <ImageViewer images={[...(p.done_work_photos_url || []), ...(p.instrument_photos_url || [])]} />
                  </div>
                ) : (
                  <div className="text-theme-text-muted text-base">{t('admin.workProcesses.noPhotos')}</div>
                )}

                {p.report_video_url && (
                  <a href={p.report_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-theme-accent hover:underline text-base">
                    <ExternalLink className="h-4 w-4" /> {t('admin.workProcesses.reportVideo')}
                  </a>
                )}

                <ProcessDetails process={p} />
              </div>
            </Card>
          ))}
        </div>

        {/* viewer moved to ImageViewer component */}
      </div>
    </div>
  );
};

const ProcessDetails: FC<{ process: WorkProcessEndOut }> = ({ process }) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<string[]>(process.comments?.map((x) => x.text || "") || []);
  const [commentIds, setCommentIds] = useState<number[]>(process.comments?.map((x) => x.id) || []);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [tasks, setTasks] = useState<{ id: number; text: string | null; finished: boolean | null }[]>(
    (process.tasks || []).map((t) => ({ id: t.id, text: t.text, finished: t.finished }))
  );
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    setComments(process.comments?.map((x) => x.text || "") || []);
    setCommentIds(process.comments?.map((x) => x.id) || []);
    setTasks((process.tasks || []).map((t) => ({ id: t.id, text: t.text, finished: t.finished })));
  }, [process.comments, process.tasks]);

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    const res = await createComment({ worker_process_id: process.id, text });
    if (!res.error && res.data) {
      setComments((prev) => [...prev, res.data.text || ""]);
      setCommentIds((prev) => [...prev, res.data.id]);
      setNewComment("");
    }
  };

  const handleEditComment = (idx: number) => {
    setEditingCommentId(commentIds[idx]);
    setEditingCommentText(comments[idx] || "");
  };

  const handleSaveComment = async () => {
    if (editingCommentId === null) return;
    const text = editingCommentText.trim();
    const res = await updateComment(editingCommentId, { text });
    if (!res.error) {
      const idx = commentIds.indexOf(editingCommentId);
      if (idx >= 0) {
        setComments((prev) => prev.map((c, i) => (i === idx ? text : c)));
      }
      setEditingCommentId(null);
      setEditingCommentText("");
    }
  };

  const handleDeleteComment = async (idx: number) => {
    const id = commentIds[idx];
    const res = await deleteComment(id);
    if (!res.error) {
      setComments((prev) => prev.filter((_, i) => i !== idx));
      setCommentIds((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleAddTask = async () => {
    const text = newTaskText.trim();
    if (!text) return;
    const res = await createWorkTask({ text, facility_id: process.facility_id ?? undefined, worker_id: process.worker_id ?? undefined });
    if (!res.error && res.data) {
      setTasks((prev) => [{ id: res.data.id, text: res.data.text, finished: res.data.finished }, ...prev]);
      setNewTaskText("");
    }
  };

  const toggleTaskFinished = async (taskId: number, finished: boolean) => {
    const res = await updateWorkTask(taskId, { finished });
    if (!res.error && res.data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { id: t.id, text: res.data.text, finished: res.data.finished } : t)));
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const res = await deleteWorkTask(taskId);
    if (!res.error) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      <Card className="p-3 bg-theme-bg-secondary border-theme-border">
        <div className="text-base font-medium text-theme-text-primary mb-3">{t('admin.workProcesses.comments')}</div>
        {comments.length === 0 ? (
          <div className="text-theme-text-muted text-base">{t('admin.workProcesses.noComments')}</div>
        ) : (
          <ul className="text-theme-text-secondary space-y-2">
            {comments.map((c, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2">
                {editingCommentId === commentIds[idx] ? (
                  <>
                    <input className="flex-1 bg-theme-bg-tertiary border border-theme-border rounded px-3 py-2 text-base" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={handleSaveComment} className="px-3 py-2 bg-theme-accent text-white rounded">{t('common.save')}</button>
                      <button onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} className="px-3 py-2 border border-theme-border rounded">{t('common.cancel')}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-base break-words">{c}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditComment(idx)} className="px-3 py-2 border border-theme-border rounded">{t('common.edit')}</button>
                      <button onClick={() => handleDeleteComment(idx)} className="px-3 py-2 border border-theme-border text-theme-error rounded">{t('common.delete')}</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input className="flex-1 bg-theme-bg-tertiary border border-theme-border rounded px-3 py-2 text-base" placeholder={t('admin.workProcesses.addComment') as string} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
          <button onClick={handleAddComment} className="px-3 py-2 bg-theme-accent text-white rounded">{t('common.add') || 'Add'}</button>
        </div>
      </Card>
      <Card className="p-3 bg-theme-bg-secondary border-theme-border">
        <div className="text-base font-medium text-theme-text-primary mb-3">{t('admin.workProcesses.tasksLatest')}</div>
        {tasks.length === 0 ? (
          <div className="text-theme-text-muted text-base">{t('admin.workProcesses.noTasks')}</div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="text-base text-theme-text-secondary flex items-center justify-between gap-3">
                <span className="truncate mr-2">{task.text || '-'}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleTaskFinished(task.id, !Boolean(task.finished))} className={"px-3 py-1 rounded border " + (task.finished ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400')}>
                    {task.finished ? t('admin.workProcesses.badges.done') : t('admin.workProcesses.badges.open')}
                  </button>
                  <button onClick={() => handleDeleteTask(task.id)} className="px-3 py-1 rounded border border-theme-border text-theme-error">{t('common.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input className="flex-1 bg-theme-bg-tertiary border border-theme-border rounded px-3 py-2 text-base" placeholder={t('admin.workProcesses.addTask') as string} value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
          <button onClick={handleAddTask} className="px-3 py-2 bg-theme-accent text-white rounded">{t('common.add') || 'Add'}</button>
        </div>
      </Card>
    </div>
  );
};

export default WorkProcesses;


