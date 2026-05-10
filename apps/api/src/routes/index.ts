import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import vehiclesRoutes from './vehicles.routes.js';
import appointmentsRoutes from './appointments.routes.js';
import availabilityRoutes from './availability.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/admin', adminRoutes);

router.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Not found' },
  });
});

export default router;
