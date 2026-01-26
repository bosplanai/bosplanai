import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoiceProducts, InvoiceProduct } from "@/hooks/useInvoiceProducts";

const VAT_OPTIONS = [
  { value: "none", label: "No VAT", rate: 0 },
  { value: "standard", label: "Standard (20%)", rate: 20 },
  { value: "reduced", label: "Reduced (5%)", rate: 5 },
  { value: "zero", label: "Zero Rated (0%)", rate: 0 },
];

interface ItemSelectProps {
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: InvoiceProduct) => void;
}

const ItemSelect = ({ value, onChange, onProductSelect }: ItemSelectProps) => {
  const { products, addProduct } = useInvoiceProducts();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<InvoiceProduct[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // New product form
  const [productName, setProductName] = useState("");
  const [productRate, setProductRate] = useState("0");
  const [productVat, setProductVat] = useState("none");

  useEffect(() => {
    if (value) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [value, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await addProduct.mutateAsync({
      name: productName,
      default_rate: parseFloat(productRate) || 0,
      default_vat: productVat,
    });
    
    onChange(result.name);
    onProductSelect?.(result);
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setProductName("");
    setProductRate("0");
    setProductVat("none");
  };

  const handleSelectProduct = (product: InvoiceProduct) => {
    onChange(product.name);
    onProductSelect?.(product);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Type or click to select an item"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsDropdownOpen(true)}
        className="bg-background"
      />
      
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto"
        >
          {filteredProducts.length > 0 ? (
            <>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center text-sm"
                  onClick={() => handleSelectProduct(product)}
                >
                  <span>{product.name}</span>
                  <span className="text-muted-foreground">
                    £{Number(product.default_rate).toFixed(2)}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No items found
            </div>
          )}
          <div className="border-t">
            <button
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm text-primary"
              onClick={() => {
                setProductName(value);
                setDialogOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              Add new item
            </button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Item Name<span className="text-destructive">*</span></Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productRate">Default Rate (£)</Label>
              <Input
                id="productRate"
                type="number"
                step="0.01"
                min="0"
                value={productRate}
                onChange={(e) => setProductRate(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productVat">Default VAT</Label>
              <Select value={productVat} onValueChange={setProductVat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addProduct.isPending}>
                {addProduct.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemSelect;
