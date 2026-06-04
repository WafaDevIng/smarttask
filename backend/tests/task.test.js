const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Project = require('../src/models/project.model');
const Task = require('../src/models/task.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smarttask_test';

let token, userId, projectId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  // Create user and login
  const res = await request(app).post('/api/auth/register').send({
    name: 'Task Tester',
    email: 'tasks@smarttask.com',
    password: 'password123'
  });
  token = res.body.token;
  userId = res.body.user._id;

  // Create project
  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Project', description: 'A test project' });
  projectId = proj.body.project._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await Task.deleteMany({});
});

describe('Tasks API', () => {
  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          projectId,
          priority: 'high',
          status: 'todo'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.task.title).toBe('Test Task');
      expect(res.body.task.priority).toBe('high');
    });

    it('should reject task without title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 1', projectId, priority: 'low' });
      await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 2', projectId, priority: 'urgent' });
    });

    it('should return all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(2);
    });

    it('should filter tasks by project', async () => {
      const res = await request(app)
        .get(`/api/tasks?project=${projectId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(2);
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status', async () => {
      const create = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Status Task', projectId });

      const taskId = create.body.task._id;
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('done');
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      const res = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toHaveProperty('todo');
      expect(res.body.stats).toHaveProperty('done');
    });
  });
});
