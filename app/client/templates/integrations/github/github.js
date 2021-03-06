Template.dropdown.onRendered(function () {
  this.$('.dropdown').dropdown();
});

Template.dropdown.onCreated(function () {
  var self = this;
  self.lastError = new ReactiveVar(null);
  self.autorun(function () {
    var controller = Router.current();
    self.subscribe('userService', controller.params.serviceType);
  });
});

Template.dropdown.events({
  'click .addRepo': function (e, template) {
    e.preventDefault();

    if (Meteor.user()) {
      var value = parseInt(template.$('.dropdown').dropdown('get value')[0]);
      var currentUser = Meteor.users.findOne({ _id: Meteor.userId() });
      var repo = currentUser.services.github.repos.filter(function (item) {
        return item.id === value;
      });

      var controller = Router.current();
      var logId = controller.params.logId;
      Meteor.call('addRepoHook', repo[0], logId, function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          throw error;
        }
        template.$('.dropdown').dropdown('clear');
        template.lastError.set(null);
      });
    }
  }
});

Template.Github.helpers({
  errorMessage: function () {
    return Template.instance().lastError.get();
  },

  'logIntegrated': function () {
    var integration = Integrations.findOne();
    if (integration)
      Session.set('integrationId', integration._id);
    return integration;
  },

  'userConnected': function () {
    return Meteor.users.findOne({_id: Meteor.userId()});
  },

  'integrations': function () {
    return Github.find({});
  },

  'repoOwner': function () {
    if (Meteor.user().services.github)
      return this.hook.repoOwner === Meteor.user().services.github.username;
  }
});

Template.Github.events({
  'click .addRepo': function (e, template) {
    e.preventDefault();

    if (Meteor.user()) {
      var value = parseInt(template.$('.dropdown').dropdown('get value')[0]);
      var currentUser = Meteor.users.findOne({ _id: Meteor.userId() });
      var repo = currentUser.services.github.repos.filter(function (item) {
        return item.id === value;
      });

      var controller = Router.current();
      var logId = controller.params.logId;
      Meteor.call('addRepoHook', repo[0], logId, function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          throw error;
        }
        template.$('.dropdown').dropdown('clear');
        template.lastError.set(null);
      });
    }
  },

  'click .remove': function (e, template) {
    e.preventDefault();

    if (Meteor.user()) {
      var github = Github.findOne({'hook.id': e.target.dataset.value});
      var integration = Integrations.findOne();

      Meteor.call('removeRepoHook', github.hook, integration._id, function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          throw error;
        } else if (response === 1) {
          template.$('.dropdown').dropdown('clear');
          template.lastError.set(null);
        }
      });
    }
  },

  'click .connectGithub': function (e, t) {
    e.preventDefault();
    if (Meteor.user()) {
      Meteor.connectWith('github', {
        requestPermissions: ['repo']
      }, function (error) {
        if (error.error) {
          t.lastError.set(error.error);
        } else {
          Meteor.call('getRepos');
        }
      })
    }
  },

  'click .disconnectGithub': function (e, t) {
    e.preventDefault();
    if (Meteor.user()) {
      Meteor.call('disconnectGithub', function (error, response) {
        if (error) throw error;
        return response;
      })
    }
  },

  'click .refreshRepos': function (e, t) {
    e.preventDefault();
    Meteor.call('getRepos', function (error, response) {
      if (error) throw error;
    });
  }
});

Template.Github.onCreated(function () {
  var self = this;
  self.lastError = new ReactiveVar(null);
  self.autorun(function () {
    var controller = Router.current();
    self.subscribe('userService', controller.params.serviceType);
    self.subscribe('github', Session.get('integrationId'));
  });
});
