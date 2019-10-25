const request = require('supertest');
const bcrypt = require('bcrypt');
const server = require('../../index');
const { User } = require('../../models/user');
const Client = require('../../elastic');

Client.insert = jest.fn();
Client.remove = jest.fn();
jest.setTimeout(10000);
const userDetails = {
  userName: 'aa',
  email: 'a@gmail.com',
  password: '12345'
};

describe('Password reset', () => {
  let userId;
  let psrtoken;
  beforeEach(async () => {
    await User.deleteMany({});
    // await VerToken.deleteMany({});
    const res = await request(server)
      .post('/users')
      .send(userDetails);
    userId = res.body.user._id;
  });
  describe('GET:/ forgot/:email', () => {
    const exec = async () => request(server).get(`/forgot/${userDetails.email}`);
    it('should return 404 -- user not found', async () => {
      await User.findOneAndDelete({ _id: userId });
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('hould return 200 -- save forgot token in database', async () => {
      await exec();
      const user = await User.findById(userId);
      expect(user.passwordResetToken).not.toBeUndefined();
    });
  });
  describe('POST: / forgot/:psrtoken', () => {
    beforeEach(async () => {
      await request(server).get(`/forgot/${userDetails.email}`);
    });
    const exec = async () =>
      request(server)
        .post(`/forgot/${psrtoken}`)
        .send({ password: '123456' });
    it('should return 404 -- token expired', async () => {
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { passwordResetExpires: Date.now() },
        { new: false }
      );
      psrtoken = user.passwordResetToken;
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 404 -- user not found', async () => {
      await User.findOneAndDelete({ _id: userId });
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 200 -- password reseted successfuly', async () => {
      let user = await User.findById(userId);
      psrtoken = user.passwordResetToken;
      const res = await exec();
      user = await User.findById(userId);
      const isValid = await bcrypt.compare('123456', user.password.toString());
      expect(res.status).toBe(200);
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
      expect(user.isVerified).toBeFalsy();
      expect(isValid).toBeTruthy();
    });
  });
});
