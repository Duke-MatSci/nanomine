%microstructure reconstruction via two-point correlaiton function matching
%by Xiaolin Li
%while writing the DeepMCR paper
% modified by Akshay Iyer for implementation in NANOMINE

function [recon, time_req, iter_req, error] = two_point_recon(target_corrf, L1,L2,correlation_choice)
tic;
%input:
%  img: original binary micrsotructure
%  L1 & L2: x and y size of the reconstructed microstructure
switch correlation_choice
    case 1
        calc_Corr = @evaluate;
        disp('Using S2');
    case 2
        calc_Corr = @L_2D;
        disp('Using L2');
    case 3
        calc_Corr = @C2;
        disp('Using C2');
    case 4
        calc_Corr = @Ss_2D;
        disp('Using Surf2');
end
display('Before proceeding, please make sure the input image is binarized');

% [L1, L2] = size(img);
%VF = sum(img(:))/L1/L2;

% L1 = dim;
% L2 = dim;
VF = target_corrf(1,1);

recon = zeros(L1, L2);
% randomly initialize a microstructure with VF
list = randperm(L1*L2);
idx = round(length(list)*VF);
recon_tmp = recon(:);
for i = 1 : idx
%     row = floor((list(i)-1) / L1) + 1;
%     col = abs(list(i) - (row-1) * L2);
%     recon(row, col) = 1;
%     list(i);
    recon_tmp(list(i))=1;
end
recon = reshape(recon_tmp,[L1,L2]);
f_obj = target_corrf;

N = min(round(L1/2), round(L2/2));
xx = 0 : N-1;
%x1 = 0 : dim - 1;
x2 = 0 : length(f_obj) - 1;
f_obj1 = interp1(x2, f_obj, xx, 'spline');

niter = 1e5;
err = 1e5;
tol = 1e-5;


for i = 1 : niter
    if mod(i, 1000) == 0
        display(err)
    end
    if err<tol
        break
    end
    % randomly pick a 1 pixel
    one_list = find_edge_1(recon);
    zero_list = find_edge_0(recon);
    idx1 = randi(length(one_list));
    idx2 = randi(length(zero_list));

    temp = recon;
    row1 = one_list(idx1, 1);
    col1 = one_list(idx1, 2);
    row2 = zero_list(idx2, 1);
    col2 = zero_list(idx2, 2);

    temp(row1, col1) = 0;
    temp(row2, col2) = 1;

    f_cur = calc_Corr(temp);
    x1 = 0:length(f_cur)-1;
    x1 = x1/L1.*L1;
    f_cur1 = interp1(x1, f_cur, xx, 'spline');
    diff = sum((f_cur1 - f_obj1).^2);
    dice = rand();
    if (diff < err) || (diff >= err && dice<0.3)
        recon = temp;
        one_list(idx1, 1) = row2;
        one_list(idx1, 2) = col2;
        zero_list(idx2, 1) = row1;
        zero_list(idx2, 2) = col1;
        err = diff;
    end

end

% eval1 = evaluate(img);
% xx1 = 0:length(eval1)-1;
% eval2 = evaluate(recon);
% xx2 = 0: length(eval2) -1;
% xx2 = xx2./dim.*L1;
%
% plot(xx1, eval1);
% hold on;
% plot(xx2, eval2, 'r');
iter_req = i;
error = err;
time_req = toc;
end
