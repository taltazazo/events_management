const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../../index');

let place;
let placeId;
let token;
let user;
let placeDetails;
const { User } = require('../../models/user');
const { Place } = require('../../models/place');
const Client = require('../../elastic');

Client.insert = jest.fn();
Client.remove = jest.fn();
jest.setTimeout(15000);

describe('places', () => {
  beforeAll(async () => {
    await User.deleteMany({});
    await Place.deleteMany({});
    const userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345'
    };
    user = new User(userDetails);
    await user.save();
  });
  beforeEach(async () => {
    placeDetails = {
      category: 'category',
      name: 'name1',
      isPublic: true,
      admins: ['a@gmail.com'],
      address: { city: 'Jerusalem', street: 'Hamekubalim 7' },
      description: 'description'
    };
    place = new Place(placeDetails);
    place.location = {
      lat: 32.073448,
      lon: 34.784157
    };
    placeId = place._id;
    token = await user.generateAuthToken();
  });
  afterAll(async () => {
    await server.close();
  });
  describe('GET :/places', () => {
    const exec = async () => {
      return request(server).get(`/places/${placeId}`);
    };
    it('should return all places', async () => {
      await place.save();
      placeId = '';
      const res = await exec();
      expect(res.body.length).toBeLessThan(6);
    });
    it('should return 400 --invalid ID', async () => {
      placeId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 --place not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return place by given ID', async () => {
      await place.save();
      const { views } = place.rates;
      const res = await exec();
      expect(res.body._id).toBe(place._id.toHexString());
      expect(res.body.rates.views).toBe(views + 1);
    });
  });
  describe('POST:/ places', () => {
    const exec = async () => {
      return request(server)
        .post('/places')
        .set('x-auth-token', token)
        .send(placeDetails);
    };
    it('should return 401 ', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 if place details invalid', async () => {
      placeDetails.name = '';
      const res = await exec();
      expect(res.status).toBe(400);
    });

    it('should return 200 insert place', async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(placeDetails.name);
    });
  });
  describe('PUT:/ places/:id', () => {
    let placeChanges;
    beforeEach(async () => {
      await place.save();
      placeChanges = { name: 'name2' };
    });
    describe('PUT:/ places/:id', () => {
      const exec = async () => {
        return request(server)
          .patch(`/places/${placeId}`)
          .set('x-auth-token', token)
          .send(placeChanges);
      };
      it('should return 401 ', async () => {
        token = '';
        const res = await exec();
        expect(res.status).toBe(401);
      });
      it('should return 400 Invalid id ', async () => {
        placeId = 1;
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 400 if place changed details invalid', async () => {
        placeChanges.name = '';
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 404 if place is not exists', async () => {
        await place.remove();
        const res = await exec();
        expect(res.status).toBe(404);
      });
      it('should return 403 do not have permission', async () => {
        place.admins = ['b@gmail.com'];
        place.isPublic = false;
        await place.save();
        placeId = place._id.toHexString();
        const res = await exec();
        expect(res.status).toBe(403);
      });
      it('should return 200 update successfully', async () => {
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('name2');
      });

      it('should return 200 insert comment successfuly', async () => {
        const comment = {
          title: 'title',
          content: 'content'
        };
        placeChanges = { comment };
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.comments[0]).toEqual(expect.objectContaining(comment));
      });
      it('should return 404 comment not found', async () => {
        const reply = {
          parent: mongoose.Types.ObjectId(),
          content: 'content'
        };
        placeChanges = { reply };
        const res = await exec();
        expect(res.status).toBe(404);
      });
      it('should return 200 insert reply to comment successfuly', async () => {
        let comment = {
          title: 'title',
          content: 'content'
        };
        placeChanges = { comment };
        let res = await exec();
        [comment] = res.body.comments;
        const reply = {
          parent: comment._id,
          content: 'content'
        };
        placeChanges = { reply };
        res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.comments[0].replies[0].content).toBe(reply.content);
      });
    });
    // eslint-disable-next-line jest/no-disabled-tests
    describe('PUT:/ places/:id/?sub', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/places/${placeId}/?sub=${q}`)
          .set('x-auth-token', token);
      };
      it('should return 200 add new subscriber successfuly', async () => {
        q = 'add';
        await exec();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.subscribers).toContain('a@gmail.com');
        expect(res.body.subscribers.length).toBe(1);
      });
      it('should return 200 remove subscriber successfuly', async () => {
        q = 'rm';
        place.subscribers.push('a@gmail.com');
        await place.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.subscribers).not.toContain('a@gmail.com');
      });
    });
    describe('PUT:/ places/:id/?like', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/places/${placeId}/?like=${q}`)
          .set('x-auth-token', token);
      };
      it('should return 400 like query invalid', async () => {
        q = 2;
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 200 add like successfuly', async () => {
        q = 1;
        const { likes } = place.rates;
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.rates.likes).toBe(likes + 1);
      });
      it('should return 200 remove like successfuly', async () => {
        q = -1;
        const { likes } = place.rates;
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.rates.likes).toBe(likes - 1);
      });
    });
    describe('PUT:/ places/:id/?admin', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/places/${placeId}/?admin=${q}`)
          .set('x-auth-token', token)
          .send(placeChanges);
      };
      it('should return 200 add new admin successfuly', async () => {
        q = 'add';
        placeChanges = { admins: ['b@gmail.com'] };
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).toContain('b@gmail.com');
        expect(res.body.admins.length).toBe(place.admins.length + 1);
      });
      it('should return 400 -- cant left place without a admin', async () => {
        q = 'rm';
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 200 delete admin successfuly', async () => {
        q = 'rm';
        place.admins.push('b@gmail.com');
        await place.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).not.toContain(user.email);
        expect(res.body.admins.length).toBe(place.admins.length - 1);
      });
    });
  });
  describe('DELETE:/ places/:id', () => {
    const exec = async () => {
      return request(server)
        .delete(`/places/${placeId}`)
        .set('x-auth-token', token);
    };
    it('should return 401 no token provided', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 for invalid id', async () => {
      placeId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 place not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 403 do not have permission', async () => {
      place.admins = ['b@gmail.com'];
      await place.save();
      const res = await exec();
      expect(res.status).toBe(403);
    });
    it('should return 200 delete place successfuly', async () => {
      await place.save();
      const res = await exec();
      expect(res.status).toBe(200);
      const p = await Place.findById(placeId);
      expect(p).toBeNull();
    });
  });
});
