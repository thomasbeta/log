Template.LogSettings.helpers({
  log: function () {
    var controller = Router.current();
    if (controller.params.logId)
      return Logs.findOne({_id: controller.params.logId});
  }
});

Template.LogSettings.events({
  'click .dropdown': function () {
    $('.selection.dropdown').dropdown();
  },

  'submit form': function (event) {
    event.preventDefault();
    var logName = event.target.logName.value;
    var logDescription = event.target.logDescription.value;
    var logAbout = event.target.logAbout.value;
    var logId = this._id;

    Meteor.call('updateLog', logId, {
      name: logName,
      about: logAbout,
      description: logDescription
    }, function (error, response) {
      if (error) throw error;
      Router.go('log', {logId: logId});
    });
  },

  'click .deleteLog': function () {
    Meteor.call('deleteLog', this._id,
      function (error, response) {
        if (error) throw error;
        Router.go('home');
      });
  }
});

Template.LogSettings.onCreated(function () {
  var self = this;
  self.autorun(function () {
    var controller = Router.current();

    if (controller.params.logId) {
      self.subscribe('log', controller.params.logId, function () {
        var log = Logs.findOne(controller.params.logId);
        if (log.creatorId !== Meteor.userId()) {
          return Router.go('log', {logId: log._id});
        }
      });
    }
  });
});
