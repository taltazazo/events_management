const request = require('supertest');
const server = require('../../index');
const Elastic = require('../../elastic');

let event;
let token;
let user;
let eventDetails;
const { Event } = require('../../models/event');
const { User } = require('../../models/user');

describe('GET: _search', () => {
  beforeAll(async () => {
    await Elastic.connect();
    await Elastic.initial();
    await User.deleteMany({});
    const userDetails = {
      userName: 'aa',
      email: 'a@gmail.com',
      password: '12345',
      preferred: {
        myCity: 'Tel Aviv Yafo',
        byCategory: true,
        myCategories: ['sport', 'tech']
      }
    };
    eventDetails = {
      category: 'category',
      name: 'name1',
      admins: ['a@gmail.com'],
      address: {
        city: 'Tel Aviv Yafo',
        street: 'Yigal Alon 98'
      },
      description: 'Description',
      tags: ['a', 'c'],
      expectedDate: Date.now() + 1000 * 60
    };
    user = new User(userDetails);
    await user.save();
    token = await user.generateAuthToken();
    event = await request(server)
      .post('/events')
      .set('x-auth-token', token)
      .send(eventDetails);
    event = event.body;
  });
  afterAll(async () => {
    await Event.deleteMany({});
    await User.deleteMany({});
    await server.close();
  });
  it('should return all events around specific location within given distance', async () => {
    const location = {
      lat: '32.079612',
      lon: '34.776523'
    };
    const dist = '3km';
    const time = 'now';
    const body = {
      query: {
        bool: {
          must: [
            {
              geo_distance: {
                distance: dist,
                location
              }
            },
            {
              range: {
                expectedDate: {
                  gte: `${time}-1h`
                }
              }
            }
          ]
        }
      }
    };
    const res = await Elastic.search(body, 'events');
    expect(res.length).toBe(1);
  });
  it('should return all events in a city', async () => {
    const body = {
      query: {
        match: {
          'address.city': event.address.city
        }
      }
    };
    const res = await Elastic.search(body, 'events');
    expect(res.length).toBe(1);
  });
  it('should return all events that match free search', async () => {
    const general = 'name1 event in Tel Aviv';
    const body = {
      query: {
        multi_match: {
          query: general,
          fields: ['category', 'tags', 'name', 'description', 'address.city', 'address.street']
        }
      }
    };
    const res = await Elastic.search(body, 'events');
    expect(res.length).toBe(1);
  });
  it('should return 0', async () => {
    const general = 'name2 event in Netanya';
    const body = {
      query: {
        multi_match: {
          query: general,
          fields: ['category', 'tags', 'name', 'description', 'address.city', 'address.street']
        }
      }
    };
    const res = await Elastic.search(body, 'events');
    expect(res.length).toBe(0);
  });
});
