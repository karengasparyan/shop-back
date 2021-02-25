import socketioJwt from 'socketio-jwt';
import _ from 'lodash';
// import { ConversationUsersRel } from "../models";

const { JWT_SECRET } = process.env;

class Socket {
  static users = {};

  static init = (io) => {
    this.io = io;
    this.io.use(socketioJwt.authorize({
      secret: JWT_SECRET,
      handshake: true,
    }));
    this.io.on('connect', this.onConnect);
  }

  static onConnect = (client) => {
    const { userId } = client.decoded_token;
    this.users[userId] = client;

    _.forEach(this.users, (user) => {
      user.emit('active_users', Object.keys(this.users));
    });

    setTimeout(() => {
      client.emit('active_users', Object.keys(this.users));
    }, 2000);

    client.on('me_typing', async (props) => {
      const { conversationId } = props;
      const conversationRel = await ConversationUsersRel.findAll({
        where: {
          conversationId,
        },
      });
      if (conversationRel.some((r) => r.userId === userId)) {
        conversationRel.forEach((r) => {
          if (r.userId !== userId) {
            this.emit(r.userId, 'typing', { typingUser: userId, conversationId });
          }
        });
      }
    });
    client.on('disconnect', () => {
      delete this.users[userId];
      _.forEach(this.users, (user) => {
        user.emit('active_users', Object.keys(this.users));
      });
    });
  }

  static emit = (userId, event, params) => {
    if (this.users[userId]) {
      this.users[userId].emit(event, params);
    }
  }
}

export default Socket;