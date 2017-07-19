const {createDeployment, Machine, Range, githubKeys, LabelRule, publicInternet}
  = require('@quilt/quilt');
let haproxy = require('@quilt/haproxy');
let Mongo = require('@quilt/mongo');
let Node = require('@quilt/nodejs');

// AWS
let namespace = createDeployment();

let baseMachine = new Machine({
    provider: 'Amazon',
    cpu: new Range(1),
    ram: new Range(2),
    sshKeys: githubKeys('ejj'),
});
namespace.deploy(baseMachine.asMaster());
namespace.deploy(baseMachine.asWorker().replicate(3));

let mongo = new Mongo(3);
let app = new Node({
  nWorker: 3,
  repo: 'https://github.com/quilt/node-todo.git',
  env: {
    PORT: '80',
    MONGO_URI: mongo.uri('mean-example'),
  },
});

let proxy = haproxy.singleServiceLoadBalancer(3, app._app);

// Places all haproxy containers on separate Worker VMs.
// This is just for convenience for the example instructions, as it allows us to
// access the web application by using the IP address of any Worker VM.
proxy.place(new LabelRule(true, proxy));

app.connect(mongo.port, mongo);
proxy.allowFrom(publicInternet, haproxy.exposedPort);

namespace.deploy([app, mongo, proxy]);
