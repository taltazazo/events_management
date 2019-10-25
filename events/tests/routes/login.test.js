const request = require('supertest');
const bcrypt = require('bcrypt');
const { User } = require('../../models/user');
const Client = require('../../elastic');
const server = require('../../index');

let email;
let password;
let user;
let token;
Client.insert = jest.fn();
Client.remove = jest.fn();
describe('AUTH:/ ', () => {
  const exec = () => {
    return request(server)
      .post('/login')
      .set('x-auth-token', token)
      .send({
        email,
        password
      });
  };
  beforeAll(async () => {
    const userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345'
    };
    user = new User(userDetails);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    user.isVerified = true;
    token = user.generateAuthToken();
    await User.deleteMany({});
  });
  beforeEach(() => {
    email = 'a@gmail.com';
    password = '12345';
  });
  afterAll(async () => {
    await server.close();
  });
  it('should return 400 if email is invalid', async () => {
    email = 'agmail.com';
    const res = await exec();
    expect(res.status).toBe(400);
  });
  it('should return 400 if password is invalid', async () => {
    password = '1234';
    const res = await exec();
    expect(res.status).toBe(400);
  });
  it('should return 404 if user not found', async () => {
    const res = await exec();
    expect(res.status).toBe(404);
  });
  it('should return 400 if password is incorrect', async () => {
    await user.save();
    password = '123456';
    const res = await exec();
    expect(res.status).toBe(400);
  });
  it('should return 200 for success', async () => {
    await user.save();
    const res = await exec();
    expect(res.status).toBe(200);
  });
});
