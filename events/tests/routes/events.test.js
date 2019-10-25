const mongoose = require('mongoose');
const request = require('supertest');
const server = require('../../index');

let event;
let eventId;
let token;
let user;
let eventDetails;
const { Event } = require('../../models/event');
const { User } = require('../../models/user');
const { Place } = require('../../models/place');
const { Channel } = require('../../models/channel');
const Client = require('../../elastic');

Client.insert = jest.fn();
Client.remove = jest.fn();
jest.setTimeout(15000);

describe('events', () => {
  beforeAll(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await Place.deleteMany({});
    await Channel.deleteMany({});
    const userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345'
    };
    user = new User(userDetails);
    await user.save();
  });
  beforeEach(() => {
    eventDetails = {
      category: 'tech',
      admins: ['a@gmail.com'],
      name: 'name1',
      description: 'description',
      tags: ['a', 'c'],
      expectedDate: Date.now() + 1000 * 60
    };
    event = new Event(eventDetails);
    eventId = event._id;
    token = user.generateAuthToken();
  });
  afterAll(async () => {
    await server.close();
  });
  describe('GET :/events', () => {
    beforeEach(() => {
      event.address = {
        city: 'Jerusalem',
        street: 'Hamekubalim 7'
      };
      event.location = {
        lat: '34.1224',
        lon: '32.125'
      };
    });
    const exec = async () => {
      return request(server).get(`/events/${eventId}`);
    };
    it('should return all events', async () => {
      await event.save();
      eventId = '';
      const res = await exec();
      expect(res.body.length).toBeLessThan(6);
    });
    it('should return 400 --invalid ID', async () => {
      eventId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 --event not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return event by given ID', async () => {
      await event.save();
      const { views } = event;
      const res = await exec();
      expect(res.body._id).toBe(event._id.toHexString());
      expect(res.body.views).toBe(views + 1);
    });
  });
  describe('POST:/ events', () => {
    const exec = async () => {
      return request(server)
        .post('/events')
        .set('x-auth-token', token)
        .send(eventDetails);
    };
    it('should return 401 ', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 if event details invalid', async () => {
      eventDetails.name = '';
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 if place is not exists', async () => {
      eventDetails.place = mongoose.Types.ObjectId().toHexString();
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 403 do not have permission', async () => {
      const place = new Place({
        category: 'category',
        admins: ['b@gmail.com'],
        name: 'name1',
        address: {
          city: 'Jerusalem',
          street: 'Hamekubalim 7'
        },
        location: {
          lat: '34.1224',
          lon: '32.125'
        },
        description: 'description'
      });
      await place.save();

      eventDetails.place = place._id.toHexString();
      eventDetails.notifyOnlySubs = false;
      const res = await exec();
      expect(res.status).toBe(403);
    });
    it('should return 200 insert event to place', async () => {
      const place = new Place({
        category: 'category',
        admins: ['a@gmail.com'],
        name: 'name1',
        address: {
          city: 'Jerusalem',
          street: 'Hamekubalim 7'
        },
        location: {
          lat: '34.1224',
          lon: '32.125'
        },
        description: 'description'
      });
      await place.save();
      eventDetails.place = place._id.toHexString();
      eventDetails.notifyOnlySubs = false;
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.place).toBe(place._id.toHexString());
    });

    it('should return 200 insert event standalone', async () => {
      eventDetails.address = {
        city: 'Jerusalem',
        street: 'Hamekubalim 7'
      };
      const res = await request(server)
        .post('/events')
        .set('x-auth-token', token)
        .send(eventDetails);
      expect(res.status).toBe(200);
    });
  });
  describe('PUT:/ events/:id', () => {
    let eventChanges;
    beforeEach(async () => {
      event.address = {
        city: 'Jerusalem',
        street: 'Hamekubalim 7'
      };
      event.location = {
        lat: '34.1224',
        lon: '32.125'
      };
      await event.save();
      eventChanges = { name: 'name2' };
    });
    afterEach(async () => {
      await Event.deleteMany({});
    });
    describe('PUT:/ events/:id', () => {
      const exec = async () => {
        return request(server)
          .patch(`/events/${eventId}`)
          .set('x-auth-token', token)
          .send(eventChanges);
      };
      it('should return 401 ', async () => {
        token = '';
        const res = await exec();
        expect(res.status).toBe(401);
      });
      it('should return 400 Invalid id ', async () => {
        eventId = 1;
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 400 if event changed details invalid', async () => {
        eventChanges.name = '';
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 404 if event is not exists', async () => {
        await event.remove();
        const res = await exec();
        expect(res.status).toBe(404);
      });
      it('should return 403 do not have permission', async () => {
        event.admins = ['b@gmail.com'];
        await event.save();
        const res = await exec();
        expect(res.status).toBe(403);
      });
      it('should return 200 -- update by admin', async () => {
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('name2');
      });
      it('should return 200 insert comment successfuly', async () => {
        const comment = {
          title: 'title',
          content: 'content'
        };
        eventChanges = { comment };
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.comments[0]).toEqual(expect.objectContaining(comment));
      });
      it('should return 404 comment not found', async () => {
        const reply = {
          parent: mongoose.Types.ObjectId(),
          content: 'content'
        };
        eventChanges = { reply };
        const res = await exec();
        expect(res.status).toBe(404);
      });
      it('should return 200 insert reply to comment successfuly', async () => {
        let comment = {
          title: 'title',
          content: 'content'
        };
        eventChanges = { comment };
        let res = await exec();
        [comment] = res.body.comments;
        const reply = {
          parent: comment._id,
          content: 'content'
        };
        eventChanges = { reply };
        res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.comments[0].replies[0].content).toBe(reply.content);
      });
    });
    describe('PUT:/ events/:id/?sub', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/events/${eventId}/?sub=${q}`)
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
        event.subscribers.push('a@gmail.com');
        await event.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.subscribers).not.toContain('a@gmail.com');
      });
    });
    describe('PUT:/ events/:id/?admin', () => {
      let q;
      const exec = async () => {
        return request(server)
          .patch(`/events/${eventId}/?admin=${q}`)
          .set('x-auth-token', token)
          .send(eventChanges);
      };
      it('should return 200 add new admin successfuly', async () => {
        q = 'add';
        eventChanges = { admins: ['b@gmail.com'] };
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).toContain('b@gmail.com');
        expect(res.body.admins.length).toBe(event.admins.length + 1);
      });
      it('should return 400 -- cant left event without a admin', async () => {
        q = 'rm';
        const res = await exec();
        expect(res.status).toBe(400);
      });
      it('should return 200 delete admin successfuly', async () => {
        q = 'rm';
        event.admins.push('b@gmail.com');
        await event.save();
        const res = await exec();
        expect(res.status).toBe(200);
        expect(res.body.admins).not.toContain(user.email);
        expect(res.body.admins.length).toBe(event.admins.length - 1);
      });
    });
    describe('PUT:/ events/:id/?channel', () => {
      let q;
      let channel;
      beforeEach(() => {
        channel = new Channel({
          name: 'name1',
          description: 'description',
          admins: [user.email]
        });
      });
      const exec = async () => {
        return request(server)
          .patch(`/events/${eventId}/?channel=${q}`)
          .set('x-auth-token', token)
          .send(eventChanges);
      };
      describe('channel side', () => {
        it('should return 404 -- channel not found', async () => {
          q = 'ok';
          eventChanges = { channel: channel._id.toHexString() };
          const res = await exec();
          expect(res.status).toBe(404);
        });
        it('should return 403 do not have permission', async () => {
          q = 'ok';
          channel.admins = ['b@gmail.com'];
          await channel.save();
          eventChanges = { channel: channel._id.toHexString() };
          const res = await exec();
          expect(res.status).toBe(403);
        });
        it('should return 404 -- not found in event.channels', async () => {
          q = 'ok';
          await channel.save();
          eventChanges = { channel: channel._id.toHexString() };
          const res = await exec();
          expect(res.status).toBe(404);
        });
        it('should return 200 confirmed to be added to event', async () => {
          q = 'ok';
          event.channels.push({ channel: channel._id });
          await event.save();
          channel.subscribers = ['t@gmail.com', 'g@gmail.com'];
          await channel.save();
          eventChanges = { channel: channel._id.toHexString() };
          const res = await exec();
          expect(res.status).toBe(200);
          expect(res.body.channels[0]).toEqual(
            expect.objectContaining({
              channel: channel._id.toHexString(),
              isPending: false,
              _id: expect.anything()
            })
          );
        });
        it('should return 200 refused to be added to event', async () => {
          q = 'no';
          event.channels.push({ channel: channel._id });
          await event.save();
          await channel.save();
          eventChanges = { channel: channel._id.toHexString() };
          const res = await exec();
          expect(res.status).toBe(200);
          expect(res.body.channels[0]).not.toEqual(
            expect.objectContaining({
              channel: channel._id.toHexString(),
              isPending: false,
              _id: expect.anything()
            })
          );
        });

        describe('event side', () => {
          it('should return 200 add new pending channel successfuly', async () => {
            q = 'add';
            await channel.save();
            eventChanges = { channel: channel._id.toHexString() };
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.channels[0]).toEqual(
              expect.objectContaining({
                channel: channel._id.toHexString(),
                isPending: true,
                _id: expect.anything()
              })
            );
            expect(res.body.channels.length).toBe(event.channels.length + 1);
          });
          it('should return 200 delete channel successfuly', async () => {
            q = 'rm';
            event.channels.push({ channel: channel._id });
            await event.save();
            eventChanges = { channel: channel._id.toHexString() };
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.channels.length).toBe(event.channels.length - 1);
            expect(res.body.channels[0]).not.toEqual(
              expect.objectContaining({
                channel: channel._id.toHexString(),
                isPending: expect.anything(),
                _id: expect.anything()
              })
            );
          });
        });
      });
    });
  });
  describe('DELETE:/ events/:id', () => {
    const exec = async () => {
      return request(server)
        .delete(`/events/${eventId}`)
        .set('x-auth-token', token);
    };
    it('should return 401 no token provided', async () => {
      token = '';
      const res = await exec();
      expect(res.status).toBe(401);
    });
    it('should return 400 for invalid id', async () => {
      eventId = 1;
      const res = await exec();
      expect(res.status).toBe(400);
    });
    it('should return 404 event not found', async () => {
      const res = await exec();
      expect(res.status).toBe(404);
    });
    it('should return 403 do not have permission', async () => {
      event.admins = ['b@gmail.com'];
      event.address = {
        city: 'Jerusalem',
        street: 'Hamekubalim 7'
      };
      event.location = {
        lat: '34.1224',
        lon: '32.125'
      };
      await event.save();
      const res = await exec();
      expect(res.status).toBe(403);
    });
    it('should return 200 delete event successfuly', async () => {
      event.address = {
        city: 'Jerusalem',
        street: 'Hamekubalim 7'
      };
      event.location = {
        lat: '34.1224',
        lon: '32.125'
      };
      await event.save();
      const res = await exec();
      expect(res.status).toBe(200);
      const e = await Event.findById(eventId);
      expect(e).toBeNull();
    });
  });
  describe('NOTIFY:/ events/:id', () => {
    it('should return 200', async () => {
      const channel = new Channel({
        name: 'name1',
        description: 'description',
        admins: [user.email],
        subscribers: ['b@gmail.com']
      });
      const place = new Place({
        category: 'category',
        admins: ['a@gmail.com'],
        name: 'name1',
        address: {
          city: 'Jerusalem',
          street: 'Hamekubalim 7'
        },
        location: {
          lat: '34.1224',
          lon: '32.125'
        },
        description: 'description'
      });
      await place.save();
      await channel.save();
      event.place = place._id.toHexString();
      event.address = place.address;
      event.location = place.location;
      event.channels = [{ channel, isPending: false }];
      // event.notifyOnlySubs = false;
      await event.save();
      const res = await request(server)
        .notify(`/events/${eventId}`)
        .set('x-auth-token', token);
      expect(res.status).toBe(200);
    });
  });
});
