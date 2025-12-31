import { Router } from 'express';
import { prisma } from '../db.js';

export const incentivesRouter = Router();

const getUserId = async (req: any) => {
  let user = await prisma.user.findFirst({ where: { username: 'demo' } });
  if (!user) {
    user = await prisma.user.create({
      data: { username: 'demo', passwordHash: 'mock', role: 'user' }
    });
  }
  return user.id;
};

// GET /api/v1/incentives/tasks
incentivesRouter.get('/incentives/tasks', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const tasks = await prisma.task.findMany({
      include: {
        userTasks: {
          where: { userId }
        }
      }
    });

    const result = tasks.map((t: any) => {
      const ut = t.userTasks[0];
      return {
        id: t.id,
        code: t.code,
        title: t.name,
        description: t.description,
        points: t.points,
        status: ut ? ut.status : 'PENDING', // PENDING, COMPLETED, CLAIMED
        progress: ut ? ut.progress : 0,
        target: t.target
      };
    });

    res.json({ code: 0, data: result });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// POST /api/v1/incentives/claim
incentivesRouter.post('/incentives/claim', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { taskId } = req.body;
    
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ code: 404, message: 'Task not found' });

    const userTask = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId } }
    });

    if (!userTask || userTask.status !== 'COMPLETED') {
      return res.status(400).json({ code: 400, message: 'Task not completed yet' });
    }

    // Transaction: Update status, Add points, Log points
    await prisma.$transaction([
      prisma.userTask.update({
        where: { id: userTask.id },
        data: { status: 'CLAIMED' }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { points: { increment: task.points } }
      }),
      prisma.pointLog.create({
        data: {
          userId,
          amount: task.points,
          reason: `Task reward: ${task.name}`
        }
      })
    ]);

    res.json({ code: 0, message: 'Claimed successfully' });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// GET /api/v1/incentives/points
incentivesRouter.get('/incentives/points', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ code: 0, data: { points: user?.points || 0 } });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});
