import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', desc: '', priority: 'medium' });

  const { user } = useAuth();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksAPI.getAll();
      setTasks(data.tasks || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || task.desc.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleDelete = async (id) => {
    try {
      await tasksAPI.delete(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleComplete = async (id) => {
    try {
      const updated = await tasksAPI.updateStatus(id, 'completed');
      setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    } catch (err) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const taskData = {
        title: newTask.title,
        desc: newTask.desc,
        priority: newTask.priority,
        status: 'pending',
        assignee: user?.username || 'Unassigned',
      };
      await tasksAPI.create(taskData);
      await fetchTasks();
      setIsModalOpen(false);
      setNewTask({ title: '', desc: '', priority: 'medium' });
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-space-lg">
      {/* Background glow */}
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 right-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm">
            <span className="font-label-code-sm text-label-code-sm text-primary uppercase font-semibold tracking-wider">Task Management Service</span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-tertiary-container/30 text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>Live PostgreSQL Connection
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-0.5">Task Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage and track your autonomous cluster operations in real-time</p>
        </div>
        <div className="flex items-center gap-space-sm self-start lg:self-center">
          <button 
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-all shadow-sm"
            onClick={fetchTasks}
          >
            <span className={`material-symbols-outlined text-[18px] text-secondary ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span className="font-label-code-md text-label-code-md">Refresh Data</span>
          </button>
          <button 
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-primary-container text-on-primary font-medium hover:bg-primary-container/90 transition-all shadow-sm shadow-primary-container/20 active:scale-[0.98]"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="font-label-code-md text-label-code-md font-bold">Create New Task</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-error p-space-md rounded shadow-sm font-body-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')}><span className="material-symbols-outlined">close</span></button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-surface-container-low p-space-md rounded flex flex-col gap-space-md shadow-sm">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-outline">search</span>
            <input 
              className="w-full h-9 pl-9 pr-8 bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-sm text-label-code-sm rounded focus:outline-none focus:ring-1 focus:ring-secondary transition-all" 
              placeholder="Search tasks..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <select className="h-9 px-3 bg-surface-container-lowest text-on-surface font-label-code-sm text-label-code-sm rounded" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="all">Priority: All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {['all', 'pending', 'in-progress', 'completed', 'failed'].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-space-md py-1.5 rounded font-label-code-sm text-label-code-sm flex items-center gap-1.5 transition-all ${statusFilter === status ? 'bg-surface-container text-on-surface font-semibold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'}`}
            >
              <span className="capitalize">{status.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-surface-container-low rounded overflow-hidden shadow-md flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant text-center">
            <span className="material-symbols-outlined text-[48px] mb-2 text-outline">task</span>
            <p className="font-body-lg font-medium">No tasks found</p>
            <p className="font-body-sm text-outline">Try adjusting your filters or create a new task.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-surface-container-lowest text-on-surface-variant font-label-code-sm text-label-code-sm uppercase tracking-wider select-none">
                  <th className="py-2.5 px-space-md min-w-[280px]">Task Title &amp; Description</th>
                  <th className="py-2.5 px-space-sm min-w-[110px]">Priority</th>
                  <th className="py-2.5 px-space-sm min-w-[120px]">Status</th>
                  <th className="py-2.5 px-space-sm min-w-[150px]">Assignee</th>
                  <th className="py-2.5 px-space-md text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transparent">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="group bg-surface-container-low hover:bg-surface-container/60 transition-colors">
                    <td className="py-2.5 px-space-md">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`font-label-code-sm text-label-code-sm ${task.priority === 'critical' ? 'text-secondary font-bold' : 'text-outline'}`}>{task.id}</span>
                          <span className="font-body-md text-body-md font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{task.title}</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{task.desc}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold capitalize ${
                        task.priority === 'critical' ? 'bg-error-container/40 text-error' :
                        task.priority === 'high' ? 'bg-secondary-container/20 text-secondary' :
                        task.priority === 'medium' ? 'bg-surface-container text-secondary' :
                        'bg-surface-container-highest text-outline font-medium'
                      }`}>{task.priority}</span>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-code-sm text-label-code-sm capitalize ${
                        task.status === 'in-progress' ? 'bg-secondary/10 text-secondary' :
                        task.status === 'completed' ? 'bg-tertiary/10 text-tertiary' :
                        task.status === 'pending' ? 'bg-surface-container-highest text-secondary-container' : ''
                      }`}>
                        {task.status === 'in-progress' && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>}
                        {task.status === 'completed' && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {task.status === 'pending' && <span className="w-2 h-2 rounded-full bg-secondary-container"></span>}
                        {task.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-space-sm text-on-surface">{task.assignee}</td>
                    <td className="py-2.5 px-space-md text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status !== 'completed' && (
                          <button className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-secondary" title="Complete" onClick={() => handleComplete(task.id)}>
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          </button>
                        )}
                        <button className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-error" title="Delete" onClick={() => handleDelete(task.id)}>
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-surface-container shadow-2xl rounded-xl w-full max-w-md p-space-xl flex flex-col gap-space-lg relative">
            <button 
              className="absolute top-4 right-4 text-outline hover:text-on-surface"
              onClick={() => setIsModalOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="font-headline-md text-on-surface">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-code-sm text-on-surface-variant">Task Title</label>
                <input 
                  className="w-full h-9 bg-surface-container-lowest text-on-surface rounded-lg px-3 outline-none focus:ring-1 focus:ring-primary"
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="E.g., Database maintenance"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-code-sm text-on-surface-variant">Description</label>
                <textarea 
                  className="w-full bg-surface-container-lowest text-on-surface rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary resize-none h-24"
                  required
                  value={newTask.desc}
                  onChange={e => setNewTask({...newTask, desc: e.target.value})}
                  placeholder="Task details..."
                ></textarea>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-code-sm text-on-surface-variant">Priority</label>
                <select 
                  className="w-full h-9 bg-surface-container-lowest text-on-surface rounded-lg px-3 outline-none focus:ring-1 focus:ring-primary"
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 mt-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-medium flex items-center justify-center gap-2 disabled:opacity-70 transition-all shadow-md"
              >
                {isSubmitting ? <span className="material-symbols-outlined animate-spin">sync</span> : null}
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
