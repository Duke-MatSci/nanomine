function [isotropy, vars] = check_isotropy(sdf2d)

[x, y] = meshgrid(1:size(sdf2d, 1), 1:size(sdf2d, 2));
x = x - round(size(sdf2d, 1) / 2);
y = y - round(size(sdf2d, 2) / 2);
sz = round(min(size(sdf2d))/2);
vars = zeros(sz, 1);
weights = zeros(sz, 1);
for R = 2:sz
    pos = x.^2 + y.^2 <= R.^2;
    eg = edge(pos);
    vars(R) = std(sdf2d(eg)) / mean(sdf2d(eg));
    weights(R) = max(sdf2d(eg));
end
weights = weights / trapz(weights) * (length(weights) - 1);
vars = vars .* weights;
vars = vars(2:end);
isotropy = mean(vars);

end