// scripts/mongo-init.js
// Executed automatically by MongoDB Docker container on first run

db = db.getSiblingDB('smarttask');

db.createCollection('users');
db.createCollection('projects');
db.createCollection('tasks');
db.createCollection('comments');
db.createCollection('notifications');

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.projects.createIndex({ owner: 1, status: 1 });
db.projects.createIndex({ members: 1 });
db.tasks.createIndex({ project: 1, status: 1 });
db.tasks.createIndex({ assignee: 1, status: 1 });
db.tasks.createIndex({ dueDate: 1 });
db.comments.createIndex({ task: 1, createdAt: 1 });
db.notifications.createIndex({ recipient: 1, read: 1, createdAt: -1 });

print('SmartTask database initialized with indexes');
