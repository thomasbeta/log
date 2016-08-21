Template.GithubIntegration.onCreated(function () {
  this.lastError = new ReactiveVar(null);
});

Template.GithubIntegration.helpers({
  integration: function () {
    return Integrations.findOne({service: 'github'});
  },
  errorMessage: function () {
    return Template.instance().lastError.get();
  }
});

Template.GithubIntegration.onRendered(function () {
  this.$('.dropdown').dropdown();
});

Template.GithubIntegration.events({
  'click .save': function (e, template) {
    e.preventDefault();

    if (Meteor.user()) {
      var value = template.$('.dropdown').dropdown('get value');
      var integration = Integrations.findOne({service: 'github'});
      var repo = integration.repos.filter(function (item) {
        return item.id === value[0];
      });

      Meteor.call('addRepoHook', repo[0], function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          console.log(error);
        } else if (response === 1) {
          template.$('.dropdown').dropdown('clear');
          template.lastError.set(null);
        }
      });
    }
  },
  'click .groupSave': function (e, template) {
    e.preventDefault();
    var userId = Meteor.userId();
    var groupId = Router.current().params.groupId;

    if (userId) {
      var value = template.$('.dropdown').dropdown('get value');
      var integration = Integrations.findOne({userId: userId, service: 'github'});
      var repo = integration.repos.filter(function (item) {
        return item.id === value[0];
      });

      Meteor.call('addRepoHook', repo[0], groupId, function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          console.log(error);
        } else if (response === 1) {
          template.$('.dropdown').dropdown('clear');
          template.lastError.set(null);
        }
      });
    }
  },
  'click .remove': function (e, template) {
    e.preventDefault();

    if (Meteor.user()) {
      var integration = Integrations.findOne({service: 'github'});
      var hook = integration.hooks.filter(function (item) {
        console.log(item, e.target.dataset.value);
        return item.id === e.target.dataset.value;
      });

      console.log(hook[0]);
      Meteor.call('removeRepoHook', hook[0], function (error, response) {
        if (error) {
          template.lastError.set(error.reason);
          console.log(error);
        } else if (response === 1) {
          template.$('.dropdown').dropdown('clear');
          template.lastError.set(null);
        }
      });
    }
  }
});
