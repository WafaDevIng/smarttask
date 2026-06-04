const Task = require('../models/task.model');
const Project = require('../models/project.model');

// POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { message, projectId } = req.body;
    const userId = req.user._id;

    // Build context from user's tasks
    const taskFilter = { $or: [{ assignee: userId }, { createdBy: userId }] };
    if (projectId) taskFilter.project = projectId;

    const tasks = await Task.find(taskFilter)
      .populate('project', 'name')
      .limit(50)
      .select('title status priority dueDate project');

    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }]
    }).select('name status').limit(10);

    // Build context string
    const context = `
Tu es SmartBot, l'assistant IA de SmartTask. Tu aides l'utilisateur à gérer ses tâches et projets.

DONNÉES ACTUELLES:
Projets (${projects.length}):
${projects.map(p => `- ${p.name} [${p.status}]`).join('\n')}

Tâches (${tasks.length}):
${tasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} | Status: ${t.status} | Projet: ${t.project?.name || 'N/A'} | Échéance: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : 'Aucune'}`).join('\n')}

Réponds en français, de manière concise et utile. Si tu identifies des tâches urgentes ou en retard, mets-les en avant.
    `.trim();

    // Try OpenAI if key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: context },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return res.json({ reply: data.choices[0].message.content });
      }
    }

    // Fallback: rule-based responses
    const reply = generateFallbackReply(message, tasks, projects);
    res.json({ reply });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function generateFallbackReply(message, tasks, projects) {
  const msg = message.toLowerCase();

  const urgent = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const todo = tasks.filter(t => t.status === 'todo');
  const done = tasks.filter(t => t.status === 'done');

  if (msg.includes('retard') || msg.includes('overdue')) {
    if (overdue.length === 0) return '✅ Bonne nouvelle ! Aucune tâche en retard pour le moment.';
    return `⚠️ Tu as **${overdue.length} tâche(s) en retard** :\n${overdue.map(t => `• ${t.title}`).join('\n')}`;
  }

  if (msg.includes('urgent') || msg.includes('priorité')) {
    if (urgent.length === 0) return 'Aucune tâche urgente en ce moment.';
    return `🔴 Tâches urgentes/haute priorité :\n${urgent.map(t => `• [${t.priority}] ${t.title}`).join('\n')}`;
  }

  if (msg.includes('résumé') || msg.includes('bilan') || msg.includes('statut')) {
    return `📊 **Résumé de tes tâches :**\n• À faire : ${todo.length}\n• En cours : ${inProgress.length}\n• Terminées : ${done.length}\n• Projets actifs : ${projects.length}`;
  }

  if (msg.includes('projet')) {
    if (projects.length === 0) return 'Tu n\'as pas encore de projets.';
    return `📁 **Tes projets :**\n${projects.map(p => `• ${p.name} [${p.status}]`).join('\n')}`;
  }

  return `👋 Bonjour ! Je suis SmartBot. Tu as actuellement **${tasks.length} tâches** réparties sur **${projects.length} projets**. Que puis-je faire pour toi ? (ex: "tâches en retard", "résumé", "tâches urgentes")`;
}

module.exports = { sendMessage };
