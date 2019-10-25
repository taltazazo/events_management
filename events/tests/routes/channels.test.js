const request = require('supertest');
const server = require('../../index');

let channel;
let channelId;
let token;
let user;
let channelDetails;
const { User } = require('../../models/user');
const { Channel } = require('../../models/channel');
const Client = require('../../elastic');

Client.insert = jest.fn();
Client.remove = jest.fn();
jest.setTimeout(15000);

describe('channels', () => {
  beforeAll(async () => {
    await Channel.deleteMany({});
    await User.deleteMany({});
    const userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345'
    };
    user = new User(userDetails);
    await user.save();
  });
  beforeEach(async () => {
    channelDetails = {
      name: 'name1',
      description: 'description',
      admins: [user.email]
    };
    channel = new Channel(channelDetails);
    channelId = channel._id;
    token = await user.generateAuthToken();
  });
  afterAll(async () => {
    await server.close();
  });
  describe('GET :/channels', () => {
    const exec = async () => {
      return request(server).get(`/channels/${channelId}`);
    };
    it('should return all channels', async () => {
      await channel.save();
      channelId = '';
      const res = await exec();
      expect(res.body.length).toBeLessThan(6);
    });
    it('should return 400 --invalid ID', async () => {
      channelId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 --channel not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return channel by given ID', async () => {
      await channel.save();
      const { views } = channel.rates;
      const res = await exec();
      expect(res.body._id).toBe(channel._id.toHexString());
      expect(res.body.rates.views).toBe(views + 1);
    });
  });
  describe('POST:/ channels', () => {
    const exec = async () => {
      return request(server)
        .post('/channels')
        .set('x-auth-token', token)
        .send(channelDetails);
    };
    it('should return 401 ', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 if channel details invalid', async () => {
      channelDetails.name = '';
      const res = await exec();
      expect(res.status).toBe(400);
    });

    it('should return 200 insert channel', async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(channelDetails.name);
    });
  });
  describe('PUT:/ channels/:id', () => {
    let channelChanges;
    beforeEach(async () => {
      await channel.save();
      channelChanges = { name: 'name2' };
    });
    describe('PUT:/ channels/:id', () => {
      const exec = async () => {
        return request(server)
          .patch(`/channels/${channelId}`)
          .set('x-auth-token', token)
          .send(channelChanges);
      };
      it('should return 401 ', async () => {
        token = '';
        const res = await exec();
        expect(res.status).toBe(401);
      });
      it('should return 400 Invalid id ', async () => {
        channelId = 1;
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 400 if channel changed details invalid', async () => {
        channelChanges.name = '';
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 404 if channel is not exists', async () => {
        await channel.remove();
        const res = await exec();
        expect(res.status).toBe(404);
      });
      it('should return 403 do not have permission', async () => {
        channel.admins = ['b@gmail.com'];
        channel.isPublic = false;
        await channel.save();
        channelId = channel._id.toHexString();
        const res = await exec();
        expect(res.status).toBe(403);
      });
      it('should return 200 update successfully', async () => {
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('name2');
      });
    });
    describe('PUT:/ channels/:id/?mess', () => {
      let q;
      const message = {
        title: 'title',
        content: '1234567890'
      };
      const exec = async () => {
        return request(server)
          .patch(`/channels/${channelId}/?mess=${q}`)
          .set('x-auth-token', token)
          .send({ message });
      };
      it('should return 200 add new message successfuly', async () => {
        q = 'add';
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.messages[0].title).toBe(message.title);
      });
      it('should return 200 remove message successfuly', async () => {
        q = 'rm';
        channel.messages.push(message);
        await channel.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.messages.length).toBe(channel.messages.length - 1);
      });
    });
    describe('PUT:/ channels/:id/?sub', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/channels/${channelId}/?sub=${q}`)
          .set('x-auth-token', token);
      };
      it('should return 200 add new subscriber successfuly', async () => {
        q = 'add';
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.subscribers).toContain('a@gmail.com');
        expect(res.body.subscribers.length).toBe(1);
      });
      it('should return 200 remove subscriber successfuly', async () => {
        q = 'rm';
        channel.subscribers.push('a@gmail.com');
        await channel.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.subscribers).not.toContain('a@gmail.com');
      });
    });
    describe('PUT:/ channels/:id/?like', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/channels/${channelId}/?like=${q}`)
          .set('x-auth-token', token);
      };
      it('should return 400 like query invalid', async () => {
        q = 2;
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 200 add like successfuly', async () => {
        q = 1;
        const { likes } = channel.rates;
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.rates.likes).toBe(likes + 1);
      });
      it('should return 200 remove like successfuly', async () => {
        q = -1;
        const { likes } = channel.rates;
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.rates.likes).toBe(likes - 1);
      });
    });
    describe('PUT:/ channels/:id/?admin', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/channels/${channelId}/?admin=${q}`)
          .set('x-auth-token', token)
          .send(channelChanges);
      };
      it('should return 200 add new admin successfuly', async () => {
        q = 'add';
        channelChanges = { admins: ['b@gmail.com'] };
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).toEqual(expect.arrayContaining(['b@gmail.com']));
        expect(res.body.admins.length).toBe(channel.admins.length + 1);
      });
      it('should return 400 -- cant left channel without a admin', async () => {
        q = 'rm';
        channelChanges = { admins: ['a@gmail.com'] };
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 200 delete admin successfuly', async () => {
        q = 'rm';
        channel.admins.push('b@gmail.com');
        await channel.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).not.toContain(user.email);
        expect(res.body.admins.length).toBe(channel.admins.length - 1);
      });
    });
  });
  describe('DELETE:/ channels/:id', () => {
    const exec = async () => {
      return request(server)
        .delete(`/channels/${channelId}`)
        .set('x-auth-token', token);
    };
    it('should return 401 no token provided', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 for invalid id', async () => {
      channelId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 channel not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 403 do not have permission', async () => {
      channel.admins = ['b@gmail.com'];
      await channel.save();
      const res = await exec();
      expect(res.status).toBe(403);
    });
    it('should return 200 delete channel successfuly', async () => {
      await channel.save();
      const res = await exec();
      expect(res.status).toBe(200);
      const p = await Channel.findById(channelId);
      expect(p).toBeNull();
    });
  });
});
