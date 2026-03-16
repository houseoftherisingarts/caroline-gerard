import React, { useState, useMemo } from 'react';
import { Plus, Edit, Calendar, LayoutDashboard, Trash2, X, CheckSquare, Square } from 'lucide-react';

// --- Types ---
type TaskStatus = 'backlog' | 'this_week' | 'today' | 'in_progress' | 'parking' | 'completed';
type Subtask = { id: string; title: string; completed: boolean };
type Task = { id: string; title: string; notes: string; deadline: string; status: TaskStatus; projectId: string; subtasks: Subtask[] };
type Project = { id: string; name: string };
type ViewMode = 'board' | 'calendar';

// --- Initial Data ---
const initialProjects: Project[] = [
  { id: 'proj-1', name: 'Lancement du Site Web' },
  { id: 'proj-2', name: 'Campagne Marketing Q2' },
];

const initialTasks: Task[] = [
  { id: 'task-1', title: 'Développer la page d\'accueil', notes: 'Intégrer le nouveau design.', deadline: '2026-03-15', status: 'in_progress', projectId: 'proj-1', subtasks: [
      { id: 'sub-1', title: 'Créer le wireframe', completed: true },
      { id: 'sub-2', title: 'Implémenter le header', completed: false },
      { id: 'sub-3', title: 'Intégrer le footer', completed: false },
  ] },
  { id: 'task-2', title: 'Configurer le SEO', notes: '', deadline: '2026-03-20', status: 'today', projectId: 'proj-1', subtasks: [
      { id: 'sub-4', title: 'Recherche de mots-clés', completed: true },
      { id: 'sub-5', title: 'Optimiser les meta descriptions', completed: false },
  ] },
  { id: 'task-3', title: 'Rédiger les articles de blog', notes: '3 articles à préparer.', deadline: '2026-04-01', status: 'this_week', projectId: 'proj-1', subtasks: [] },
  { id: 'task-4', title: 'Planifier les posts sur les réseaux sociaux', notes: '', deadline: '2026-04-10', status: 'backlog', projectId: 'proj-2', subtasks: [] },
  { id: 'task-5', title: 'Finaliser la vidéo de lancement', notes: '', deadline: '2026-03-25', status: 'parking', projectId: 'proj-1', subtasks: [] },
  { id: 'task-6', title: 'Tester le formulaire de contact', notes: '', deadline: '2026-03-12', status: 'completed', projectId: 'proj-1', subtasks: [] },
];

const statusConfig: { [key in TaskStatus]: { title: string; color: string } } = {
  backlog: { title: 'Backlog', color: 'bg-slate-500' },
  this_week: { title: 'À faire cette semaine', color: 'bg-blue-500' },
  today: { title: 'À faire aujourd\'hui', color: 'bg-purple-500' },
  in_progress: { title: 'En cours', color: 'bg-yellow-500' },
  parking: { title: 'Parking', color: 'bg-pink-500' },
  completed: { title: 'Terminé', color: 'bg-green-500' },
};

// --- Main Component ---
const AdminKanban = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-1');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const activeTasks = useMemo(() => tasks.filter(t => t.projectId === activeProjectId), [tasks, activeProjectId]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
  };

  const handleAddTask = (status: TaskStatus) => {
    const newTask: Task = {
        id: `task-${Date.now()}`,
        title: 'Nouvelle tâche',
        notes: '',
        deadline: new Date().toISOString().split('T')[0],
        status,
        projectId: activeProjectId,
        subtasks: []
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(newTask);
  }

  const handleDeleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setEditingTask(null);
  }

  const addProject = () => {
      const newProjectName = prompt('Nom du nouveau projet:');
      if(newProjectName) {
          const newProject: Project = { id: `proj-${Date.now()}`, name: newProjectName };
          setProjects(prev => [...prev, newProject]);
          setActiveProjectId(newProject.id);
      }
  }

  const handleAddSubtask = () => {
    if (editingTask && newSubtaskTitle.trim() !== '') {
      const newSubtask: Subtask = { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false };
      setEditingTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, newSubtask] } : null);
      setNewSubtaskTitle('');
    }
  };

  const handleUpdateSubtask = (subtaskId: string, field: keyof Subtask, value: string | boolean) => {
    setEditingTask(prev => prev ? {
      ...prev,
      subtasks: prev.subtasks.map(sub => sub.id === subtaskId ? { ...sub, [field]: value } : sub)
    } : null);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setEditingTask(prev => prev ? {
      ...prev,
      subtasks: prev.subtasks.filter(sub => sub.id !== subtaskId)
    } : null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-serif font-bold text-white">Gestion de Projets</h1>
            <p className="text-slate-400 mt-1">Organisez vos tâches avec la vue Kanban ou Calendrier.</p>
        </div>
        <div className="flex items-center gap-4 bg-midnight/60 border border-white/10 p-2 rounded-xl">
          <select value={activeProjectId} onChange={e => setActiveProjectId(e.target.value)} className="bg-black/20 text-white rounded-lg p-2 border border-transparent focus:outline-none focus:border-gold">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={addProject} className="p-2 text-white bg-white/5 hover:bg-white/10 rounded-lg"><Plus size={20}/></button>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
            <button onClick={() => setViewMode('board')} className={`p-2 rounded-md ${viewMode === 'board' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}><LayoutDashboard size={18}/></button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white'}`}><Calendar size={18}/></button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'board' ? (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, status as TaskStatus)} className="w-72 flex-shrink-0 bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 flex flex-col">
              <div className={`flex items-center gap-2 p-3 border-b border-white/10`}>
                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                <h3 className="font-bold text-white">{config.title}</h3>
                <span className="text-sm text-slate-500 ml-auto">{activeTasks.filter(t => t.status === status).length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {activeTasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} className="bg-black/30 p-3 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing">
                    <div className="flex justify-between items-start">
                        <p className="text-white font-semibold">{task.title}</p>
                        <button onClick={() => setEditingTask(task)} className="p-1 text-slate-500 hover:text-white"><Edit size={14}/></button>
                    </div>
                    {task.subtasks.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                            {task.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2 text-xs text-slate-400">
                                    {subtask.completed ? <CheckSquare size={14} className="text-green-400" /> : <Square size={14} />}
                                    <span className={subtask.completed ? 'line-through' : ''}>{subtask.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>{new Date(task.deadline).toLocaleDateString('fr-CA')}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2">
                  <button onClick={() => handleAddTask(status as TaskStatus)} className="w-full text-left text-sm text-slate-400 hover:text-gold p-2 rounded-md flex items-center gap-2"><Plus size={16}/> Ajouter une tâche</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 flex-1 overflow-y-auto">
            {Object.entries(activeTasks.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).reduce((acc, task) => {
                const date = new Date(task.deadline).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                if(!acc[date]) acc[date] = [];
                acc[date].push(task);
                return acc;
            }, {} as Record<string, Task[]>)).map(([date, tasksForDate]) => (
                <div key={date} className="mb-6">
                    <h3 className="font-bold text-gold border-b border-white/10 pb-2 mb-3">{date}</h3>
                    <div className="space-y-2">
                        {tasksForDate.map(task => (
                            <div key={task.id} className="bg-black/20 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-white font-semibold">{task.title}</p>
                                    {task.subtasks.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <CheckSquare size={14} className="text-green-400" />
                                            <span>{task.subtasks.filter(sub => sub.completed).length} / {task.subtasks.length}</span>
                                        </div>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusConfig[task.status].color} mt-1 block w-fit`}>{statusConfig[task.status].title}</span>
                                </div>
                                <button onClick={() => setEditingTask(task)} className="p-2 text-slate-500 hover:text-white"><Edit size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fade-in" onClick={() => setEditingTask(null)}>
          <div className="bg-midnight/80 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg m-4 p-6 relative space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-serif text-white">Modifier la tâche</h2>
                <button onClick={() => setEditingTask(null)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <input type="text" value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white" placeholder="Titre de la tâche" />
            <textarea value={editingTask.notes} onChange={e => setEditingTask({ ...editingTask, notes: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white h-32 resize-none" placeholder="Ajouter des notes..." />
            
            {/* Subtasks Section */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Sous-tâches</h3>
                {editingTask.subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                        <input 
                            type="checkbox" 
                            checked={subtask.completed} 
                            onChange={e => handleUpdateSubtask(subtask.id, 'completed', e.target.checked)}
                            className="form-checkbox h-4 w-4 text-gold rounded border-gray-300 focus:ring-gold"
                        />
                        <input 
                            type="text" 
                            value={subtask.title}
                            onChange={e => handleUpdateSubtask(subtask.id, 'title', e.target.value)}
                            className={`flex-1 bg-transparent text-white focus:outline-none ${subtask.completed ? 'line-through text-slate-500' : ''}`}
                        />
                        <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg p-2 text-white" 
                        placeholder="Ajouter une nouvelle sous-tâche..."
                    />
                    <button onClick={handleAddSubtask} className="bg-gold text-midnight p-2 rounded-lg hover:bg-white"><Plus size={20}/></button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-slate-400 font-bold">Échéance</label>
                    <input type="date" value={editingTask.deadline} onChange={e => setEditingTask({ ...editingTask, deadline: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white mt-1" />
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-bold">Déplacer vers...</label>
                    <select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white mt-1">
                        {Object.entries(statusConfig).map(([status, config]) => <option key={status} value={status}>{config.title}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-between items-center pt-4">
                <button onClick={() => handleDeleteTask(editingTask.id)} className="text-red-500 hover:text-red-400 font-bold flex items-center gap-2"><Trash2 size={16}/> Supprimer</button>
                <button onClick={() => handleUpdateTask(editingTask)} className="bg-gold text-midnight font-bold py-2 px-4 rounded-lg hover:bg-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKanban;
