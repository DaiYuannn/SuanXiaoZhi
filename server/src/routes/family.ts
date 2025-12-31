import { Router } from 'express';
import { prisma } from '../db.js';
import { z } from 'zod';

export const familyRouter = Router();

// Mock auth middleware replacement
const getUserId = async (req: any) => {
  // In a real app, verify JWT. Here, return a demo user or create one.
  let user = await prisma.user.findFirst({ where: { username: 'demo' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: 'demo',
        passwordHash: 'mock_hash',
        role: 'user'
      }
    });
  }
  return user.id;
};

// POST /api/v1/family
familyRouter.post('/family', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { name, description } = req.body;
    
    if (!name) return res.status(400).json({ code: 400, message: 'Family name required' });

    const family = await prisma.family.create({
      data: {
        name,
        description,
        members: { connect: { id: userId } }
      }
    });

    // Create a default shared ledger for the family
    await prisma.ledger.create({
      data: {
        name: `${name}的公共账本`,
        type: 'FAMILY',
        familyId: family.id,
        ownerId: userId
      }
    });

    res.json({ code: 0, data: family });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// GET /api/v1/family/members
familyRouter.get('/family/members', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: { include: { members: true } } }
    });

    if (!user?.family) {
      return res.json({ code: 0, data: [] });
    }

    res.json({ code: 0, data: user.family.members.map((m: any) => ({ id: m.id, username: m.username, role: m.role })) });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// GET /api/v1/family/ledgers
familyRouter.get('/family/ledgers', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: { include: { ledgers: true } } }
    });

    if (!user?.family) {
      return res.json({ code: 0, data: [] });
    }

    res.json({ code: 0, data: user.family.ledgers });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// POST /api/v1/family/invite
familyRouter.post('/family/invite', async (req, res) => {
  // Mock invite code generation
  const code = Math.random().toString(36).substring(7).toUpperCase();
  res.json({ code: 0, data: { inviteCode: code, expiry: '24h' } });
});
