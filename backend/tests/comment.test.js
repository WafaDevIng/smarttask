const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Task = require('../src/models/task.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smarttask_test';
let token, projectId, taskId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Comment Tester', email: 'comment@smarttask.com', password: 'password123'
  });
  token = reg.body.token;

  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Comment Project' });
  projectId = proj.body.project._id;

  const task = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Task for Comment', projectId });
  taskId = task.body.task._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Comments API', () => {
  let commentId;

  describe('POST /api/tasks/:taskId/comments', () => {
    it('should add a comment to a task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'This is a test comment.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.comment.content).toBe('This is a test comment.');
      expect(res.body.comment.author).toBeDefined();
      commentId = res.body.comment._id;
    });

    it('should reject empty comment', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks/:taskId/comments', () => {
    it('should return comments for a task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/comments/:id', () => {
    it('should update own comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated comment text.' });
      expect(res.statusCode).toBe(200);
      expect(res.body.comment.content).toBe('Updated comment text.');
      expect(res.body.comment.edited).toBe(true);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete own comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
