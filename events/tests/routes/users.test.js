const request = require('supertest');
const server = require('../../index');

let user;
let userDetails;
const { User } = require('../../models/user');
const Client = require('../../elastic');

Client.insert = jest.fn();
Client.remove = jest.fn();

describe('users', () => {
  beforeAll(async () => {
    await User.deleteMany({});
  });
  beforeEach(async () => {
    userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345'
    };
    user = new User(userDetails);
  });
  afterEach(async () => {
    await User.deleteMany({});
  });
  afterAll(async () => {
    await server.close();
  });
  describe('GET :/users', () => {
    it('should return all users', async () => {
      await user.save();
      const res = await request(server).get('/users');
      expect(res.body.length).toBe(1);
    });
    it('should return 400 --invalid ID', async () => {
      const res = await request(server).get(`/users/${1}`);
      expect(res.status).toBe(400);
    });
    it('should return 404 --user not found', async () => {
      const res = await request(server).get(`/users/${user._id}`);
      expect(res.status).toBe(404);
    });
    it('should return my profile', async () => {
      const token = user.generateAuthToken();
      await user.save();
      const res = await request(server)
        .get('/users/me')
        .set('x-auth-token', token);
      expect(res.body.email).toBe(user.email);
    });
    it('should return user by given ID', async () => {
      await user.save();
      const res = await request(server).get(`/users/${user._id}`);
      expect(res.body.email).toBe(user.email);
    });
  });
  describe('POST :/users', () => {
    const exec = async () => {
      return request(server)
        .post('/users')
        .send(userDetails);
    };
    it('should return 400 if user is invalid', async () => {
      userDetails.email = 'a';
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 400 if user already exists', async () => {
      await user.save();
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 200 for adding user successfuly', async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.user.userName).toBe('aa');
    });
  });
  describe('PUT: /users/:id', () => {
    let token;
    beforeEach(() => {
      token = user.generateAuthToken();
    });
    const exec = async () => {
      return request(server)
        .put('/users/me')
        .set('x-auth-token', token)
        .send(userDetails);
    };
    it('should return 401 no token provided', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 for invalid properties', async () => {
      userDetails.email = 'a';
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 user not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 200 for updating successfuly', async () => {
      await user.save();
      userDetails.userName = 'bb';
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.userName).toBe('bb');
    });
    it('should logout', async () => {
      await user.save();
      const res = await request(server)
        .put('/users/me/logout')
        .set('x-auth-token', token);
      expect(res.status).toBe(200);
      expect(res.header['x-auth-token']).toBe('');
    });
  });
  describe('DELETE: /users/:id', () => {
    let token;
    beforeEach(() => {
      token = user.generateAuthToken();
    });
    const exec = async () => {
      return request(server)
        .delete('/users/me')
        .set('x-auth-token', token);
    };
    it('should return 401 no token provided', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 404 user not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 200 delete user successfuly', async () => {
      await user.save();
      const res = await exec();
      expect(res.status).toBe(200);
    });
  });
});
