import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

interface Candidate {
  id: number;
  name: string;
  image: string;
  party: string;
  description: string;
}

let candidates: Candidate[] = [
    { id: 1, name: "Alice Johnson", image: "https://randomuser.me/api/portraits/women/1.jpg", party: "Green Party", description: "Environmental activist and community leader." },
    { id: 2, name: "Bob Smith", image: "https://randomuser.me/api/portraits/men/2.jpg", party: "Liberal Party", description: "Experienced politician focused on education reform." },
    { id: 3, name: "Carla Gomez", image: "https://randomuser.me/api/portraits/women/3.jpg", party: "Conservative Party", description: "Businesswoman and advocate for economic growth." },
    { id: 4, name: "David Lee", image: "https://randomuser.me/api/portraits/men/4.jpg", party: "Progressive Party", description: "Tech entrepreneur and supporter of innovation." },
    { id: 5, name: "Eva Müller", image: "https://randomuser.me/api/portraits/women/5.jpg", party: "Social Party", description: "Social worker dedicated to healthcare access." },
];

const randomCandidates = [
    { name: "John Doe", party: "Independent" },
    { name: "Jane Smith", party: "Green Party" },
    { name: "Peter Jones", party: "Liberal Party" },
    { name: "Mary Williams", party: "Conservative Party" },
    { name: "Chris Brown", party: "Progressive Party" },
];

let interval: NodeJS.Timeout | null = null;

app.use(express.json());

app.get('/api/candidates', (req: Request, res: Response) => {
  res.json(candidates);
});

app.post('/api/candidates', (req: Request, res: Response) => {
    const newCandidate = { ...req.body, id: Date.now() };
    candidates.push(newCandidate);
    io.emit('update', candidates);
    res.status(201).json(newCandidate);
});

app.put('/api/candidates/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const index = candidates.findIndex(c => c.id === id);
    if (index !== -1) {
        candidates[index] = { ...candidates[index], ...req.body };
        io.emit('update', candidates);
        res.json(candidates[index]);
    } else {
        res.status(404).send('Candidate not found');
    }
});

app.delete('/api/candidates/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    candidates = candidates.filter(c => c.id !== id);
    io.emit('update', candidates);
    res.status(204).send();
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('startUpdates', () => {
    console.log('Received startUpdates event from a client.');
    if (interval) return;
    interval = setInterval(() => {
      const randomCandidate = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
      const newCandidate = {
          id: Date.now(),
          name: randomCandidate.name,
          image: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 100)}.jpg`,
          party: randomCandidate.party,
          description: "A new candidate.",
      };
      candidates.push(newCandidate);
      console.log(`Emitting 'update' with ${candidates.length} candidates.`);
      io.emit('update', candidates);
    }, 2000);
  });

  socket.on('stopUpdates', () => {
    console.log('Received stopUpdates event from a client.');
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (io.sockets.sockets.size === 0 && interval) {
        clearInterval(interval);
        interval = null;
    }
  });
});

server.listen(4001, () => {
  console.log('listening on *:4001');
});