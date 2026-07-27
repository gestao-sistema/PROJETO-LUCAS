import { useState, useRef } from "react";
import { LogOut, User, Settings, Camera, KeyRound, Loader2, Sun, Moon } from "lucide-react";
import { useProfile, initials } from "@/lib/profile";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function ProfileMenu() {
  const profile = useProfile((s) => s.profile);
  const logout = useProfile((s) => s.logout);
  const updateProfile = useProfile((s) => s.updateProfile);
  const changePassword = useProfile((s) => s.changePassword);
  const uploadAvatar = useProfile((s) => s.uploadAvatar);
  const { theme, toggleTheme } = useTheme();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!profile) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium leading-none">
              {profile.name.split(" ")[0]}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl">
          <DropdownMenuLabel className="flex items-center gap-3 py-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{profile.name}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">
                {profile.email}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <User className="mr-2 inline h-3.5 w-3.5" />
            {profile.role}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmLogout(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair do sistema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sair do sistema?</DialogTitle>
            <DialogDescription>
              Você precisará entrar novamente para acessar o painel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmLogout(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmLogout(false);
                logout();
                toast("Sessão encerrada.");
              }}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={profile}
        onUpdateProfile={updateProfile}
        onChangePassword={changePassword}
        onUploadAvatar={uploadAvatar}
      />
    </>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  profile,
  onUpdateProfile,
  onChangePassword,
  onUploadAvatar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: { name: string; email: string; avatar: string };
  onUpdateProfile: (updates: Partial<{ name: string; phone: string }>) => Promise<string | null>;
  onChangePassword: (current: string, newPwd: string) => Promise<string | null>;
  onUploadAvatar: (file: File) => Promise<string | null>;
}) {
  const [name, setName] = useState(profile.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setSaving(true);
    onUpdateProfile({ name }).then((err) => {
      setSaving(false);
      if (err) toast.error(err);
      else setSaved(true);
    });
  }

  function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Nova senha deve ter no mínimo 6 caracteres");
      return;
    }
    setSaving(true);
    onChangePassword(currentPassword, newPassword).then((err) => {
      setSaving(false);
      if (err) toast.error(err);
      else {
        toast.success("Senha alterada com sucesso");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }
    setUploading(true);
    const url = await onUploadAvatar(file);
    setUploading(false);
    if (url) toast.success("Foto atualizada");
    else toast.error("Erro ao enviar foto");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Configurações da conta</DialogTitle>
          <DialogDescription>Altere seus dados, foto de perfil e senha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {initials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{profile.name}</div>
              <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || name === profile.name}
            className="w-full rounded-xl"
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
          </Button>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alterar senha
              </span>
            </div>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
              className="rounded-xl"
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              className="rounded-xl"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              className="rounded-xl"
            />
            <Button
              onClick={handlePasswordChange}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full rounded-xl"
              variant="outline"
            >
              {saving ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
