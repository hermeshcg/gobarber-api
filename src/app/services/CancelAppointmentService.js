import { subHours, isBefore } from 'date-fns';

import Appointment from '../models/Appointment';
import User from '../models/User';

import Queue from '../../lib/Queue';
import Cache from '../../lib/Cache';

import CancellationMail from '../jobs/CancellationMail';

class CancelAppointmentService {
  async run({ provider_id, user_id }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== user_id) {
      throw new Error("You don't have permission to cancel this appoitment");
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      throw new Error('You can only cancel appointments 2 hours in advanced.');
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, { appointment });

    await Cache.invalidatePrefix(`user:${user_id}:appointment`);

    return appointment;
  }
}

export default new CancelAppointmentService();
