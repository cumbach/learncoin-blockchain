// CONSTANTS ================================================================================
HASH_RATE = 3000 // how often a block is added to the chain
COINS_PER_BLOCK = 100 // how many coins are created each block
SNAPSHOT_RATE = 1 // how often to console log the data
STARTING_USERS = 10
STARTING_PROBLEMS = 10
RATE_OF_PROBLEM_CREATION = 105 // no new problems created at 100, half of all users create a new problem at 200
PROBLEM_PURCHASE_RATE = .10; // the percentage that goes to the company wallet when a user buys access to a problem


// MAIN ================================================================================
function LearnCoinBlockchain() {
  this.companyWallet = 0;
  this.users = addNewUsers(STARTING_USERS); // represents current active users
  this.allProblems = addInitialProblems(this.users, STARTING_PROBLEMS);

  var intervalNum = 0;

  // COINS_PER_BLOCK new learncoins are created approximately every HASH_RATE milliseconds as blocks are added
  // in implementation each active user will be mining while solving problems
  this.newlyCreatedLearnCoin = COINS_PER_BLOCK;

  // initialize with a simulated amount of time spent per block using averages
  this.totalTimeSpentOnLastBlock = 0;
  this.allProblems.forEach(function(problem){
    this.totalTimeSpentOnLastBlock += problem.averageTimeToSolve;
  }.bind(this));

  // IMPORTANT: every new interval represents a new block being created
  setInterval(function() {
    this.totalTimeSpentOnBlock = 0;

    // we expect a certain percentage of users to constantly add problems
    // we dont add users this way, because we expect the active user rate to remain fairly constant
    this.allProblems = this.allProblems.concat(addNewProblems(this.users));

    // log details every SNAPSHOT_RATE blocks
    if (intervalNum % SNAPSHOT_RATE === 0) {
      this.printSnapshot(intervalNum);
    }

    if (this.allProblems.length > 0) {
      var solvedProblems = [];
      // Allows us to introduce potential scenarios along the blockchain to see how it might affect creation (simulate hacking)
      this.introduceScenario(intervalNum)

      solvedProblems = solvedProblems.concat(this.solveProblems());
      if (solvedProblems) {
        this.adjustAverageSolutionTimes(solvedProblems);
      }
      this.distributeCoins(solvedProblems);
    }
    this.totalTimeSpentOnLastBlock = this.totalTimeSpentOnBlock;

    intervalNum += 1;
  }.bind(this), HASH_RATE);
}

LearnCoinBlockchain.prototype.printSnapshot = function (intervalNum) {
  console.log('iteration: ', intervalNum);
  console.log('\nusers: ', this.users);
  console.log('\nproblems: ', this.allProblems);
  console.log('\n\n\n\n');
};

LearnCoinBlockchain.prototype.payoutUsersAndCreators = function (solvedProblems) {
  this.users.forEach(function(user){
    for (var i = 0; i < solvedProblems.length; i++) {
      if (user.userId === solvedProblems[i].userId) {
        // give the user 90 percent of their problem's "contribution" to that block
        var blockContribution = solvedProblems[i].averageTimeToSolve / this.totalTimeSpentOnBlock * .9;
        user.wallet += blockContribution * this.newlyCreatedLearnCoin;
      } else if (user.userId === solvedProblems[i].creatorId) {
        // give the creator 10 percent of their problem's "contribution" to that block
        var blockContribution = solvedProblems[i].averageTimeToSolve / this.totalTimeSpentOnBlock * .1;
        user.wallet += blockContribution * this.newlyCreatedLearnCoin;
      }
    }
  }.bind(this))
};

LearnCoinBlockchain.prototype.introduceScenario = function (intervalNum) {
  switch(intervalNum) {
    case 1:
      this.attemptHackOne();
      break;
    case 7:
      this.addNewUser();
      break;
    default:
      break;
  }
};

LearnCoinBlockchain.prototype.addNewUser = function () {
  var user = new User({name: 'Huan'});
  this.users = this.users.concat(user);
};

LearnCoinBlockchain.prototype.attemptHackOne = function () {
  // With this hack, a user who creates a problem and then spends a long time "pretending"
  // to solve it, would artificially increase the value of that problem
  var user = new User({name: 'Chris', level: -1});
  this.users = this.users.concat(user);

  this.allProblems.push(new Problem({ userId: user.userId, averageTimeToSolve: 10 }));

  // Results:
  // We see that users aren't as inclined to choose a harder problem, so fewer people try to solve it
  // In a real world scenario, we would also expect to see the averageTimeToSolve for that problem drop quickly
  // We could ban users who do this intentionally
};

LearnCoinBlockchain.prototype.adjustAverageSolutionTimes = function (solvedProblems) {
  solvedProblems.forEach(function(solvedProblem){
    var problem = this.allProblems.filter(function(problem){
      return solvedProblem.problemId === problem.problemId;
    });

    var user = this.users.filter(function(user){
      return user.userId === solvedProblem.userId;
    });

    var timeToSolve = calculateTimeToSolve(solvedProblem.averageTimeToSolve, user[0].level);

    // adjust the average time it takes to solve this problem
    problem[0].averageTimeToSolve = ((problem[0].timesSolved * problem[0].averageTimeToSolve) + timeToSolve) / (problem[0].timesSolved + 1);
    problem[0].timesSolved = problem[0].timesSolved + 1;

  }.bind(this));
};

LearnCoinBlockchain.prototype.solveProblems = function () {
  var solvedProblems = [];
  for (var i = 0; i < this.users.length; i++) {
    var problem = chooseAppropriateProblem(this.users[i], this.allProblems);
    if (problem) {
      this.payForProblem(this.users[i], problem);
      // this.users[i].payForProblem(problem, this.totalTimeSpentOnLastBlock, this.companyWallet);
      var solvedProblem = {};
      Object.keys(problem).forEach(function(key){
        solvedProblem[key] = problem[key];
      });
      solvedProblem.userId = this.users[i].userId;
      solvedProblem.userLevel = this.users[i].level;
      solvedProblems.push(solvedProblem);
    }
  }
  return solvedProblems;
};

LearnCoinBlockchain.prototype.payForProblem = function (user, problem) {
  var expectedEarnings = (problem.averageTimeToSolve / this.totalTimeSpentOnLastBlock) * COINS_PER_BLOCK;
  user.removeFromUserWallet(expectedEarnings);
  this.addToCompanyWallet(expectedEarnings);
};

LearnCoinBlockchain.prototype.addToCompanyWallet = function (expectedEarnings) {
  // You would expect to make PROBLEM_PURCHASE_RATE of whatever the user expects to earn
  this.companyWallet += expectedEarnings * PROBLEM_PURCHASE_RATE;
};

LearnCoinBlockchain.prototype.distributeCoins = function (solvedProblems) {
  for (var i = 0; i < solvedProblems.length; i++) {
    this.totalTimeSpentOnBlock += solvedProblems[i].averageTimeToSolve;
  }
  this.payoutUsersAndCreators(solvedProblems);
};



// USER ================================================================================
function User(options) {
  if (options && options.name) {
    this.name = options.name;
  }
  this.userId = random(200000);
  if (options && options.level) {
    this.level = options.level;
  } else {
    this.level = random(10); // How good at solving/creating algorithms is this person?
  }
  this.wallet = 10;
}

User.prototype.removeFromUserWallet = function (expectedEarnings) {
  // You would expect to pay PROBLEM_PURCHASE_RATE of whatever you expect to earn
  this.wallet -= expectedEarnings * PROBLEM_PURCHASE_RATE;
};



// PROBLEM ================================================================================
function Problem(options) {
  this.problemId = random(200000);
  this.creatorId = options.userId;
  this.timesSolved = 1; // Creator must solve the problem to initialize average time
  this.averageTimeToSolve = options.averageTimeToSolve;
}


// HELPERS ================================================================================
function addNewUsers(numberOfNewUsers) {
  var users = [];
  for (var i = 0; i < numberOfNewUsers; i++) {
    users.push(new User());
  }
  return users;
}

function addInitialProblems(users, numberOfProblemsToCreate) {
  var newProblems = [];
  var problemsCreated = 0;
  while (problemsCreated <= numberOfProblemsToCreate) {
    var user = users[random(users.length - 1)];
    var userId = user.userId;
    // low level creators can only create easy problems, but high level creators can create any kind of problem
    var averageTimeToSolve = random(user.level, 1);
    newProblems.push(new Problem({ userId, averageTimeToSolve }));
    problemsCreated += 1;
  }
  return newProblems;
}

function addNewProblems(users) {
  var newProblems = [];
  for (var i = 0; i < users.length; i++) {
    // one in every twenty users will create a problem every block
    if (random(RATE_OF_PROBLEM_CREATION) > 100) {
      var userId = users[i].userId;
      // low level creators can only create easy problems, but high level creators can create any kind of problem
      var averageTimeToSolve = random(users[i].level, 1);
      newProblems.push(new Problem({ userId, averageTimeToSolve }));
    }
  }
  return newProblems;
}

function random(max, min) {
  // returns random integer between min/0 (inclusive) and max (inclusive)
  if (!min) {
    return Math.floor((max + 1) * Math.random());
  } else {
    return Math.floor(Math.random() * ((max + 1) - min)) + min;
  }
}

function chooseAppropriateProblem(user, problems) {
  // we assume here that the user will only choose problems with an averageTimeToSolve below their user level
  var answerableProblems = [];

  for (var i = 0; i < problems.length; i++) {
    if (user.level > problems[i].averageTimeToSolve) {
      answerableProblems.push(problems[i]);
    }
  }
  // early on, it is possible that there are no problems that this user is capable of solving
  if (answerableProblems.length === 0) return null;

  return answerableProblems[random(answerableProblems.length - 1)];
}

function calculateTimeToSolve(averageProblemTime, userLevel) {
  return 10 * (averageProblemTime / userLevel);
}


new LearnCoinBlockchain();
