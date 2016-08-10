/*****************************************************************************/
/*  Server Methods */
/*****************************************************************************/
import P from 'bluebird';

Meteor.methods({
  'saveNote': function (note) {
    note.userId = Meteor.userId();
    note.createdAt = new Date;

    if(note.userId) {
      return Notes.insert(note, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          return response;
        }
      });
    }
  },
  'saveNow': function (item) {
    item.userId = Meteor.userId();
    item.createdAt = new Date;

    if(item.userId) {
      return Nows.insert(item, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          Meteor.call('saveEvent', response, item.userId, 'now_created', 'Nows');
          return response;
        }
      });
    }
  },
  'saveMessage': function (content, groupId) {
    var item = {
      userId: Meteor.userId(),
      createdAt: new Date,
      content: content
    };

    if (item.userId) {
      return Messages.insert(item, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          Meteor.call('saveEvent', response, item.userId, groupId, 'message_created', 'Messages');
          return response;
        }
      });
    }
  },
  'saveEvent': function (id, userId, groupId, type, refType) {
    var item = {
      type: type,
      createdAt: new Date
    };

    if (userId) item.userId = userId;
    if (groupId) item.groupId = groupId;
    if (refType === 'Messages') {
      item.messageId = id;
    } else if (refType === 'Nows') {
      item.nowId = id;
    }

    if (item.userId || item.groupId) {
      return Events.insert(item, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          return;
        }
      });
    }
  },
  'saveComment': function (comment) {
    // Save comment
    comment.userId = Meteor.userId();
    comment.createdAt = new Date;
    var commentId = Comments.insert(comment);
    comment._id = commentId;

    // Save notification for subscribers
    Meteor.call('saveNoteCommentNotifications', comment);
  },
  'saveNoteCommentNotifications': function (comment) {
    // Save commenter to the note's subscribers array
    var note = Notes.findOne(comment.noteId);
    if (!note.subscribers || note.subscribers.indexOf(comment.userId) < 0) {
      Notes.update(
        {_id: comment.noteId},
        {$push: { subscribers: comment.userId}}
      );

      if(!note.subscribers) {
        note.subscribers = [];
      }
      note.subscribers.push(comment.userId);
    }

    // Save a notification for all subscribers
    _.each(note.subscribers, function(subscriber) {
      Notifications.insert({
        userId: subscriber,
        noteId: note._id,
        commentId: comment._id,
        action: 'created',
        createdAt: new Date
      });
    })
  },
  'addNewLog': function(item){
    check(item.name, String);
    item.creatorId = Meteor.userId();
    item.createdAt = new Date;

    if (item.creatorId) {
      return Logs.insert(item, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          Meteor.call('saveEvent', response, item.creatorId, response, 'log_created', 'Logs');
          return response;
        }
      });
    }
  },
  'addNewGroup': function(item){
    check(item.name, String);
    item.creatorId = Meteor.userId();
    item.createdAt = new Date;

    if (item.creatorId) {
      return Groups.insert(item, function(error, response) {
        if (error) {
          console.log('error: ', error);
          throw error;
        } else {
          Meteor.call('saveEvent', response, item.creatorId, response, 'group_created', 'Groups');
          return response;
        }
      });
    }
  },
  'userExists': function(username){
    return !!Meteor.users.findOne({username: username});
  },
  'getRepos': function() {
    console.log('tryna snatch');
    // Query Github for users' repos
    // Save integration with repos
    var GitHub = require('github');

    var user = Meteor.user();
    var github = new GitHub({
      version: '3.0.0'
    });

    github.authenticate({
      type: 'oauth',
      token: user.services.github.accessToken
    });

    github.repos.getAll({}, Meteor.bindEnvironment(function(error, response) {
      if (error) {
        console.log('error:', error);
      }

      if (response) {
        P.map(response, Meteor.bindEnvironment(function(item) {
          return _.pick(item, 'id', 'name', 'full_name', 'html_url', 'owner');
        })).then(Meteor.bindEnvironment(function(items) {
          console.log('items', items.length);
          var integration = {
            service: 'github',
            repos: items
          };

          Meteor.call('saveIntegration', integration);
        }));
      }
    }));
  },

  'saveIntegration': function (item) {
    var userId = Meteor.userId();
    var updateObj = {userId: userId, service: 'github'};

    Integrations.upsert(
      updateObj, {
      // $push: {
      //   repos: item.repos,
      // },
      $set: {
        repos: item.repos,
        createdAt: Date.now()
      }
    });
  },
  'addRepoHook': function (repo, groupId) {
    var user = Meteor.user();
    console.log('user', user);
    var endpoint;
    var GitHub = require('github');
    var github = new GitHub({
      version: '3.0.0'
    });

    github.authenticate({
      type: 'oauth',
      token: user.services.github.accessToken
    });

    if (groupId) {
      endpoint = 'http://1217ea69.ngrok.io/integrations/group/' + groupId;
    } else {
      endpoint = 'http://1217ea69.ngrok.io/integrations/' + user._id;
    }

    console.log('adding webhook', repo.id, groupId);
    return github.repos.createHook({
      name: 'web',
      active: true,
      user: repo.owner.login,
      repo: repo.name,
      config: {
        'content_type': 'json',
        'url': endpoint
      },
      events: [
        'commit_comment',
        'create',
        'issues',
        'issue_comment',
        'push'
      ]
    }).then(function(response) {
      console.log('user agian', user);
      console.log('add webhook response');
      var updateObj = {userId: user._id, service: 'github'};
      var hook = _.pick(response, 'type', 'id', 'events', 'config', 'updated_at', 'last_response');
      hook.repo = repo.name;
      hook.repoOwner = repo.owner.login;
      if (groupId) hook.groupId = groupId;
      
      return Integrations.update(
        updateObj,
        {$push: {'hooks': hook}} 
      );
    }).catch(function(error) {
      console.log('error adding repo hook: ', error);
      throw error;
    });
  },
  'removeRepoHook': function (hook, groupId) {
    var user = Meteor.user();
    var GitHub = require('github');
    var github = new GitHub({
      version: '3.0.0'
    });

    github.authenticate({
      type: 'oauth',
      token: user.services.github.accessToken
    });

    return github.repos.deleteHook({
      user: hook.repoOwner,
      repo: hook.repo,
      id: hook.id
    }).then(function(response) {
      var updateObj = {userId: user._id, service: 'github'};
      
      if (groupId) {
        updateObj.groupId = groupId;
      }
      
      return Integrations.update(
        updateObj,
        {$pull: {hooks: {id: hook.id}}}
      );
    }).catch(function(error) {
      console.log('error removing github webhook:', error);
      throw error;
    });
  },
  'saveGitHubEvent': function(item, type, userId, groupId) {
    // Save message then save event

    console.log('saveGitHubEvent', type, userId, groupId);
    var message = {
      service: 'github',
      type: type,
      data: item,
      createdAt: new Date
    };

    if (userId) message.userId = userId;

    Messages.insert(message, function(error, response) {
      if (error) {
        console.log('error saving message: ', error);
        throw error;
      } else {
        Meteor.call('saveEvent', response, userId, groupId, 'message_created', 'Messages');
        return response;
      }
    });
  }
});
