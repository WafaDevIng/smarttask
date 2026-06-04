const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Project = require('../src/models/project.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smarttask_test';
let token, userId, projectId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const res = await request(app).post('/api/auth/register').send({
    name: 'Project Tester', email: 'proj@smarttask.com', password: 'password123'
  });
  token = res.body.token;
  userId = res.body.user._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await Project.deleteMany({});
});

describe('Projects API', () => {
  describe('POST /api/projects', () => {
    it('should create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project', description: 'Desc', color: '#6366f1' });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.name).toBe('Test Project');
      expect(res.body.project.owner.email).toBe('proj@smarttask.com');
      projectId = res.body.project._id;
    });

    it('should reject project without name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      await request(app).post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Project A', color: '#6366f1' });
      await request(app).post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Project B', color: '#10b981' });
    });

    it('should return all user projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(2);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a project by id', async () => {
      const create = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Detail Project' });

      const res = await request(app)
        .get(`/api/projects/${create.body.project._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.name).toBe('Detail Project');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const create = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Old Name' });

      const res = await request(app)
        .put(`/api/projects/${create.body.project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', status: 'completed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.name).toBe('New Name');
      expect(res.body.project.status).toBe('completed');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const create = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'To Delete' });

      const res = await request(app)
        .delete(`/api/projects/${create.body.project._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    it('should return project stats', async () => {
      const create = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Stats Project' });

      const res = await request(app)
        .get(`/api/projects/${create.body.project._id}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('taskStats');
      expect(res.body).toHaveProperty('completion');
    });
  });
});

describe('Notifications API', () => {
  it('should return notifications list', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
  });

  it('should mark all notifications as read', async () => {
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});
