import { useState } from "react";
import { TradingSignal } from "@/types/trading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TradeApprovalModalProps {
  signal: TradingSignal;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (quantity: number) => void;
  isLoading?: boolean;
}

export default function TradeApprovalModal({
  signal,
  isOpen,
  onClose,
  onApprove,
  isLoading = false,
}: TradeApprovalModalProps) {
  const [quantity, setQuantity] = useState(1);

  const handleApprove = () => {
    onApprove(quantity);
  };

  const calculateTotalRisk = () => {
    return parseFloat(signal.maxRisk) * quantity;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-800 border-dark-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-dark-100">
            Approve Trade Signal
          </DialogTitle>
          <p className="text-sm text-dark-400">Review AI-generated trade recommendation</p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-dark-400">Symbol</Label>
              <Input 
                value={signal.ticker} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
            <div>
              <Label className="text-sm text-dark-400">Strategy</Label>
              <Input 
                value={signal.strategy} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-dark-400">Max Risk Per Contract</Label>
              <Input 
                value={`$${signal.maxRisk}`} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
            <div>
              <Label className="text-sm text-dark-400">Quantity</Label>
              <Input 
                type="number" 
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-dark-400">Entry Price</Label>
              <Input 
                value={`$${signal.entryPrice}`} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
            <div>
              <Label className="text-sm text-dark-400">Target Price</Label>
              <Input 
                value={`$${signal.targetPrice}`} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-dark-100"
              />
            </div>
            <div>
              <Label className="text-sm text-dark-400">Total Risk</Label>
              <Input 
                value={`$${calculateTotalRisk().toFixed(2)}`} 
                readOnly 
                className="bg-dark-700 border-dark-600 text-red-400 font-bold"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm text-dark-400">AI Confidence</Label>
            <Input 
              value={`${parseFloat(signal.confidence).toFixed(1)}%`} 
              readOnly 
              className="bg-dark-700 border-dark-600 text-green-400"
            />
          </div>
          
          <div>
            <Label className="text-sm text-dark-400">AI Reasoning</Label>
            <Textarea 
              value={signal.reasoning}
              readOnly 
              rows={3}
              className="bg-dark-700 border-dark-600 text-dark-100 resize-none"
            />
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6 pt-4 border-t border-dark-700">
          <Button 
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 border-dark-600"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Execute Trade
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
