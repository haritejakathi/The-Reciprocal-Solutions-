const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/reciprocal-solutions', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const User = mongoose.model('User', UserSchema);

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Project = mongoose.model('Project', ProjectSchema);

// Task Schema
const TaskSchema = new mongoose.Schema({
  name: String,
  status: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
});

const Task = mongoose.model('Task', TaskSchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'secretkey', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User Registration
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, role });
  user.save(err => {
    if (err) return res.status(500).send('Error registering new user.');
    res.status(200).send('User registered successfully!');
  });
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).send('User not found');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).send('Invalid password');

  const token = jwt.sign({ username: user.username, role: user.role }, 'secretkey');
  res.json({ token });
});

// Create Project
app.post('/projects', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const project = new Project({ name, description, user: req.user._id });
  project.save(err => {
    if (err) return res.status(500).send('Error creating project.');
    res.status(200).send('Project created successfully!');
  });
});

// Get Projects
app.get('/projects', authenticateToken, async (req, res) => {
  const projects = await Project.find({ user: req.user._id });
  res.json(projects);
});

// Update Project
app.put('/projects/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  await Project.findByIdAndUpdate(req.params.id, { name, description });
  res.status(200).send('Project updated successfully!');
});

// Delete Project
app.delete('/projects/:id', authenticateToken, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.status(200).send('Project deleted successfully!');
});

// Create Task
app.post('/tasks', authenticateToken, async (req, res) => {
  const { name, status, projectId } = req.body;
  const task = new Task({ name, status, project: projectId });
  task.save(err => {
    if (err) return res.status(500).send('Error creating task.');
    res.status(200).send('Task created successfully!');
  });
});

// Get Tasks
app.get('/tasks', authenticateToken, async (req, res) => {
  const tasks = await Task.find({ project: req.query.projectId });
  res.json(tasks);
});

// Update Task
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { name, status } = req.body;
  await Task.findByIdAndUpdate(req.params.id, { name, status });
  res.status(200).send('Task updated successfully!');
});

// Delete Task
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(200).send('Task deleted successfully!');
});

// Starting the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
