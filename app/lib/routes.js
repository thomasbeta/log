if (Meteor.isClient) {
  Router.configure({
    layoutTemplate: 'MasterLayout',
    loadingTemplate: 'Loading',
    notFoundTemplate: 'NotFound'
  });

  Router.route('/', {
    name: 'home',
    controller: 'HomeController',
    where: 'client'
  });

  Router.route('/integrations/evernote', {
    name: 'integration.evernote',
    controller: 'IntegrationController',
    action: 'evernote',
    where: 'client'
  });

  Router.route('/account', {
    name: 'account',
    before: function () {
      if (Meteor.user()) {
        this.redirect('/');
      } else {
        this.render('account');
      }
    }
  });

  Router.route('/notifications', {
    name: 'notifications',
    controller: 'NotificationController',
    action: 'detail',
    where: 'client'
  });

  Router.route('/search', {
    name: 'search',
    controller: 'SearchController',
    action: 'search',
    where: 'client'
  });

  Router.route('/:username', {
    name: 'user',
    controller: 'UserController',
    action: 'detail',
    where: 'client'
  });

  Router.route('/:username/edit', {
    name: 'user.edit',
    controller: 'UserController',
    action: 'edit',
    where: 'client'
  });

  Router.route('/log/new/', {
    name: 'log.new',
    controller: 'LogController',
    action: 'new',
    where: 'client'
  });

  Router.route('/log/:logId', {
    name: 'log',
    controller: 'LogController',
    action: 'messages',
    where: 'client'
  });

  Router.route('/log/:logId/messages', {
    name: 'log.messages',
    controller: 'LogController',
    action: 'messages',
    where: 'client'
  });

  Router.route('/log/:logId/about', {
    name: 'log.about',
    controller: 'LogController',
    action: 'about',
    where: 'client'
  });

  Router.route('/log/:logId/files', {
    name: 'log.files',
    controller: 'LogController',
    action: 'files',
    where: 'client'
  });

  Router.route('/log/:logId/settings', {
    name: 'log.settings',
    controller: 'LogController',
    action: 'settings',
    where: 'client'
  });

  Router.route('/log/:logId/integrations', {
    name: 'log.integrations',
    controller: 'LogController',
    action: 'integrations',
    where: 'client'
  });

  Router.route('/log/:logId/integrations/:serviceType', {
    name: 'log.integration',
    controller: 'LogController',
    action: 'integration',
    where: 'client'
  });
}

if (Meteor.isServer) {
  Router.route('/integrations/trello/:hookId', { where: 'server' })
    .post(function () {
      var body = this.request.body;
      if (body && body.action && body.action.data) {
        Meteor.call('saveTrelloEvent',
                    body.action,
                    body.action.type,
                    this.params.hookId);
      } else {
        console.log('Ping from Trello but didn\'t recieve event data.');
      }

      this.response.end('Thanks Trello, we got your message!');
    });

  Router.route('/integrations/:logId/:_id', { where: 'server' })
    .post(function () {
      var user = Meteor.users.findOne({_id: this.params._id});
      console.log('this.request.body.sender.id', this.request.body.sender.id);
      console.log('user.services.github', user.services.github);
      console.log('this.request.body', this.request.body);
      console.log("this.request.headers['x-github-event']", this.request.headers['x-github-event']);
      if (this.request.body.sender.id === user.services.github.id) {
        Meteor.call('saveGitHubEvent', this.request.body, this.request.headers['x-github-event'], this.params.logId, function (error, response) {
          if (error) throw error;
        });
      }
      this.response.end('Thanks Github, we got your message!');
    });
}
