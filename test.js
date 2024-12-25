// Add these new routes to your existing Express backend

// Delete user and associated receipts
app.delete("/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Delete user
      const deletedUser = await User.findOneAndDelete({ userId });
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete all associated return items
      await ReturnItem.deleteMany({ userId });
      
      res.json({ message: "User and associated receipts deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting user", error: err.message });
    }
  });
  
  // Delete single return item
  app.delete("/return-items/:receiptNumber", async (req, res) => {
    try {
      const { receiptNumber } = req.params;
      
      const deletedItem = await ReturnItem.findOneAndDelete({ receiptNumber });
      if (!deletedItem) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.json({ message: "Receipt deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting receipt", error: err.message });
    }
  });
  
  // Update return item
  app.put("/return-items/:receiptNumber", async (req, res) => {
    try {
      const { receiptNumber } = req.params;
      
      // Validate the incoming data
      const updates = {
        ...req.body,
        sizes: req.body.sizes.map(size => ({
          size: size.size,
          pisces: parseInt(size.pisces) || 0,
          mark: parseInt(size.mark) || 0,
          total: parseInt(size.total) || 0
        })),
        total: parseInt(req.body.total) || 0,
        grandTotal: parseInt(req.body.grandTotal) || 0
      };
      
      const updatedItem = await ReturnItem.findOneAndUpdate(
        { receiptNumber },
        updates,
        { new: true }
      );
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.json(updatedItem);
    } catch (err) {
      res.status(400).json({ message: "Error updating receipt", error: err.message });
    }
  });