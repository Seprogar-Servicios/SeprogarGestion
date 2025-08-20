const Subscription = require('../models/Subscription');

/**
 * @desc    Subscribe to push notifications
 * @route   POST /api/subscribe
 * @access  Public
 */
exports.subscribe = async (req, res) => {
  const subscriptionData = req.body;

  // Asocia la suscripción con el usuario autenticado
  const subscription = {
    ...subscriptionData,
    user: req.user._id, // Asume que authenticateToken añade el usuario a req
  };

  try {
    // Evitar duplicados basados en el endpoint
    const existingSubscription = await Subscription.findOne({ endpoint: subscription.endpoint });

    if (existingSubscription) {
      console.log('Subscription already exists.');
      return res.status(200).json({ message: 'Subscription already exists.' });
    }

    const newSubscription = new Subscription(subscription);
    await newSubscription.save();

    res.status(201).json({ message: 'Subscription saved successfully.' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription.' });
  }
};
