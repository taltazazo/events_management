const request = require('supertest');
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

describe('Email confirmation', () => {
  let userId;
  let vertoken;
  beforeEach(async () => {
    await User.deleteMany({});
    // await VerToken.deleteMany({});
    const res = await request(server)
      .post('/users')
      .send(userDetails);
    userId = res.body.user._id;
  });
  describe('/confirmation:vertoken', () => {
    const exec = async () => request(server).get(`/confirmation/${vertoken}`);
    it('should save confirmation token in database', async () => {
      const user = await User.findById(userId);
      expect(user.emailConfirmationToken).not.toBeUndefined();
      expect(user.isVerified).toBeFalsy();
    });
    it('should return 400 -- not verified', async () => {
      const res = await request(server)
        .post('/login')
        .send({ email: userDetails.email, password: userDetails.password });
      expect(res.status).toBe(401);
    });
    it('should return 404 -- token expired', async () => {
      // verToken = await VerToken.findOneAndDelete({ user: userId });
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { emailConfirmationExpires: Date.now() },
        { new: false }
      );
      vertoken = user.emailConfirmationToken;
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 400 -- has already verified', async () => {
      const user = await User.findById(userId);
      user.isVerified = true;
      await user.save();
      vertoken = user.emailConfirmationToken;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 200 -- email verified successfuly', async () => {
      let user = await User.findById(userId);
      vertoken = user.emailConfirmationToken;
      const res = await exec();
      user = await User.findById(userId);
      expect(res.status).toBe(200);
      expect(user.emailConfirmationToken).toBeUndefined();
      expect(user.emailConfirmationExpires).toBeUndefined();
      expect(user.isVerified).toBeTruthy();
    });
  });
  describe('/resend-token', () => {
    const exec = async () =>
      request(server)
        .post(`/confirmation/resend`)
        .send({ email: userDetails.email });
    it('should return 404 -- user not found', async () => {
      await User.findOneAndDelete({ _id: userId });
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 400 -- has already verified', async () => {
      const user = await User.findById(userId);
      user.isVerified = true;
      await user.save();
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 200 -- resend token successfuly', async () => {
      const res = await exec();
      const user = await User.findById(userId);
      expect(res.status).toBe(200);
      expect(user.emailConfirmationToken).not.toBeUndefined();
      expect(user.isVerified).toBeFalsy();
    });
  });
});
